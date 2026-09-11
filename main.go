package main

import (
	"embed"
	"encoding/json"
	"errors"
	"fmt"
	"html/template"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

//go:embed templates/*.html static/*
var embeddedFiles embed.FS

type WordList struct {
	Title string   `json:"title"`
	Words []string `json:"words"`
}

type LessonRepetitions struct {
	Copy          int `json:"copy"`
	LetterBuilder int `json:"letterBuilder"`
	Guided        int `json:"guided"`
	Spell         int `json:"spell"`
}

type LessonPlan struct {
	BeginnerDays int               `json:"beginnerDays"`
	Beginner     LessonRepetitions `json:"beginner"`
	Advanced     LessonRepetitions `json:"advanced"`
}

type Config struct {
	Lists            []WordList `json:"lists"`
	TestWordsPerList int        `json:"testWordsPerList"`
	LessonPlan       LessonPlan `json:"lessonPlan"`
}

type Store struct {
	mu     sync.RWMutex
	path   string
	config Config
}

var defaultConfig = Config{
	Lists: []WordList{
		{Title: "Starter words", Words: []string{"apple", "because", "friend", "little", "school", "would"}},
	},
	TestWordsPerList: 5,
	LessonPlan: LessonPlan{
		BeginnerDays: 2,
		Beginner:     LessonRepetitions{Copy: 3, LetterBuilder: 3, Guided: 3},
		Advanced:     LessonRepetitions{Guided: 3, Spell: 3},
	},
}

func NewStore(path string) (*Store, error) {
	s := &Store{path: path, config: defaultConfig}
	data, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return s, nil
	}
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(data, &s.config); err != nil {
		return nil, fmt.Errorf("read settings: %w", err)
	}
	return s, nil
}

func (s *Store) Get() Config {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return cloneConfig(s.config)
}

func (s *Store) Save(config Config) error {
	config = cleanConfig(config)
	if err := validateConfig(config); err != nil {
		return err
	}
	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(s.path), 0755); err != nil {
		return err
	}
	tmp := s.path + ".tmp"
	if err := os.WriteFile(tmp, append(data, '\n'), 0644); err != nil {
		return err
	}
	if err := os.Rename(tmp, s.path); err != nil {
		return err
	}
	s.mu.Lock()
	s.config = cloneConfig(config)
	s.mu.Unlock()
	return nil
}

func cloneConfig(config Config) Config {
	out := Config{Lists: make([]WordList, len(config.Lists)), TestWordsPerList: config.TestWordsPerList, LessonPlan: config.LessonPlan}
	for i, list := range config.Lists {
		out.Lists[i] = WordList{Title: list.Title, Words: append([]string(nil), list.Words...)}
	}
	return out
}

func cleanConfig(config Config) Config {
	if config.TestWordsPerList == 0 {
		config.TestWordsPerList = 5
	}
	for i := range config.Lists {
		config.Lists[i].Title = strings.TrimSpace(config.Lists[i].Title)
		words := make([]string, 0, len(config.Lists[i].Words))
		seen := make(map[string]bool)
		for _, word := range config.Lists[i].Words {
			word = strings.TrimSpace(word)
			key := strings.ToLower(word)
			if word != "" && !seen[key] {
				words = append(words, word)
				seen[key] = true
			}
		}
		config.Lists[i].Words = words
	}
	return config
}

func validateConfig(config Config) error {
	if err := validateLessonPlan(config.LessonPlan); err != nil {
		return err
	}
	if config.TestWordsPerList < 1 || config.TestWordsPerList > 100 {
		return errors.New("test words per list must be between 1 and 100")
	}
	if len(config.Lists) == 0 {
		return errors.New("add at least one word list")
	}
	for i, list := range config.Lists {
		if list.Title == "" {
			return fmt.Errorf("list %d needs a title", i+1)
		}
		if len(list.Words) == 0 {
			return fmt.Errorf("%q needs at least one word", list.Title)
		}
		if len(list.Words) > 500 {
			return fmt.Errorf("%q has too many words (maximum 500)", list.Title)
		}
	}
	return nil
}

func validateLessonPlan(plan LessonPlan) error {
	if plan.BeginnerDays < 0 || plan.BeginnerDays > 365 {
		return errors.New("beginner days must be between 0 and 365")
	}
	validateMode := func(name string, mode LessonRepetitions, required bool) error {
		values := []int{mode.Copy, mode.LetterBuilder, mode.Guided, mode.Spell}
		total := 0
		for _, value := range values {
			if value < 0 || value > 100 {
				return fmt.Errorf("%s repetitions must be between 0 and 100", name)
			}
			total += value
		}
		if required && total == 0 {
			return fmt.Errorf("%s mode must enable at least one lesson", name)
		}
		return nil
	}
	if err := validateMode("beginner", plan.Beginner, plan.BeginnerDays > 0); err != nil {
		return err
	}
	return validateMode("advanced", plan.Advanced, true)
}

type App struct {
	store     *Store
	templates *template.Template
	staticFS  fs.FS
}

func NewApp(store *Store, templateDir, staticDir string) (*App, error) {
	funcs := template.FuncMap{
		"json": func(value any) (template.JS, error) {
			data, err := json.Marshal(value)
			return template.JS(data), err
		},
	}
	t, err := template.New("").Funcs(funcs).ParseGlob(filepath.Join(templateDir, "*.html"))
	if err != nil {
		return nil, err
	}
	return &App{store: store, templates: t, staticFS: os.DirFS(staticDir)}, nil
}

func NewEmbeddedApp(store *Store) (*App, error) {
	funcs := template.FuncMap{
		"json": func(value any) (template.JS, error) {
			data, err := json.Marshal(value)
			return template.JS(data), err
		},
	}
	t, err := template.New("").Funcs(funcs).ParseFS(embeddedFiles, "templates/*.html")
	if err != nil {
		return nil, err
	}
	staticFiles, err := fs.Sub(embeddedFiles, "static")
	if err != nil {
		return nil, err
	}
	return &App{store: store, templates: t, staticFS: staticFiles}, nil
}

func (a *App) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /{$}", a.practice)
	mux.HandleFunc("GET /settings", a.settings)
	mux.HandleFunc("GET /test", a.test)
	mux.HandleFunc("GET /progress", a.progress)
	mux.HandleFunc("GET /api/config", a.getConfig)
	mux.HandleFunc("POST /api/config", a.saveConfig)
	mux.Handle("GET /static/", http.StripPrefix("/static/", http.FileServer(http.FS(a.staticFS))))
	return securityHeaders(mux)
}

func (a *App) practice(w http.ResponseWriter, r *http.Request) {
	a.render(w, "index.html", map[string]any{"Config": a.store.Get()})
}

func (a *App) settings(w http.ResponseWriter, r *http.Request) {
	a.render(w, "settings.html", nil)
}

func (a *App) test(w http.ResponseWriter, r *http.Request) {
	a.render(w, "test.html", map[string]any{"Config": a.store.Get()})
}

func (a *App) progress(w http.ResponseWriter, r *http.Request) {
	a.render(w, "progress.html", nil)
}

func (a *App) getConfig(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, a.store.Get())
}

func (a *App) saveConfig(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var config Config
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&config); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid settings: " + err.Error()})
		return
	}
	if err := a.store.Save(config); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, a.store.Get())
}

func (a *App) render(w http.ResponseWriter, name string, data any) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	if err := a.templates.ExecuteTemplate(w, name, data); err != nil {
		log.Printf("render %s: %v", name, err)
	}
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "no-referrer")
		next.ServeHTTP(w, r)
	})
}

func main() {
	addr := envOr("ADDR", ":8080")
	dataFile := envOr("DATA_FILE", filepath.Join("data", "settings.json"))
	store, err := NewStore(dataFile)
	if err != nil {
		log.Fatal(err)
	}
	app, err := NewEmbeddedApp(store)
	if err != nil {
		log.Fatal(err)
	}
	server := &http.Server{Addr: addr, Handler: app.Handler(), ReadHeaderTimeout: 5 * time.Second}
	log.Printf("Spelling B is listening on http://localhost%s", addr)
	log.Fatal(server.ListenAndServe())
}

func envOr(name, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}

package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestStoreSaveCleansAndPersists(t *testing.T) {
	path := filepath.Join(t.TempDir(), "settings.json")
	store, err := NewStore(path)
	if err != nil {
		t.Fatal(err)
	}
	config := Config{Lists: []WordList{{Title: " Week 1 ", Words: []string{" apple ", "", "Apple", "pear"}}}, LessonPlan: defaultConfig.LessonPlan}
	if err := store.Save(config); err != nil {
		t.Fatal(err)
	}
	reloaded, err := NewStore(path)
	if err != nil {
		t.Fatal(err)
	}
	got := reloaded.Get()
	if got.Lists[0].Title != "Week 1" {
		t.Fatalf("title = %q", got.Lists[0].Title)
	}
	if len(got.Lists[0].Words) != 2 || got.Lists[0].Words[0] != "apple" {
		t.Fatalf("words = %#v", got.Lists[0].Words)
	}
}

func TestConfigAPI(t *testing.T) {
	dir := t.TempDir()
	store, err := NewStore(filepath.Join(dir, "settings.json"))
	if err != nil {
		t.Fatal(err)
	}
	app, err := NewApp(store, "templates", "static")
	if err != nil {
		t.Fatal(err)
	}
	payload, err := json.Marshal(Config{
		TestWordsPerList: 2,
		LessonPlan:       defaultConfig.LessonPlan,
		Lists:            []WordList{{Title: "Animals", Words: []string{"cat", "dog"}}},
	})
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodPost, "/api/config", strings.NewReader(string(payload)))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var config Config
	if err := json.NewDecoder(rec.Body).Decode(&config); err != nil {
		t.Fatal(err)
	}
	if config.TestWordsPerList != 2 {
		t.Fatalf("test words per list = %d", config.TestWordsPerList)
	}
	if config.Lists[0].Title != "Animals" {
		t.Fatalf("config = %#v", config)
	}
}

func TestConfigAPIRejectsEmptyList(t *testing.T) {
	dir := t.TempDir()
	store, _ := NewStore(filepath.Join(dir, "settings.json"))
	app, _ := NewApp(store, "templates", "static")
	req := httptest.NewRequest(http.MethodPost, "/api/config", strings.NewReader(`{"testWordsPerList":2,"lessonPlan":{"beginnerDays":2,"beginner":{"copy":3,"letterBuilder":3,"guided":3,"spell":0},"advanced":{"copy":0,"letterBuilder":0,"guided":3,"spell":3}},"lists":[]}`))
	rec := httptest.NewRecorder()
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d", rec.Code)
	}
}

func TestPagesRender(t *testing.T) {
	store, _ := NewStore(filepath.Join(t.TempDir(), "settings.json"))
	app, err := NewApp(store, "templates", "static")
	if err != nil {
		t.Fatal(err)
	}
	for _, path := range []string{"/", "/settings", "/test", "/progress", "/high-frequency", "/phonics", "/typing"} {
		rec := httptest.NewRecorder()
		app.Handler().ServeHTTP(rec, httptest.NewRequest(http.MethodGet, path, nil))
		if rec.Code != http.StatusOK {
			t.Fatalf("%s status = %d", path, rec.Code)
		}
		if !strings.Contains(rec.Header().Get("Content-Type"), "text/html") {
			t.Fatalf("%s content type = %q", path, rec.Header().Get("Content-Type"))
		}
	}
}

func TestMain(m *testing.M) {
	os.Exit(m.Run())
}

func TestOldConfigGetsDefaultTestLimit(t *testing.T) {
	path := filepath.Join(t.TempDir(), "settings.json")
	if err := os.WriteFile(path, []byte(`{"lists":[{"title":"Old","words":["word"]}]}`), 0644); err != nil {
		t.Fatal(err)
	}
	store, err := NewStore(path)
	if err != nil {
		t.Fatal(err)
	}
	if got := store.Get().TestWordsPerList; got != 5 {
		t.Fatalf("default test words per list = %d", got)
	}
	if got := store.Get().LessonPlan; got != defaultConfig.LessonPlan {
		t.Fatalf("default lesson plan = %#v", got)
	}
}

func TestConfigAPIRejectsInvalidTestLimit(t *testing.T) {
	store, _ := NewStore(filepath.Join(t.TempDir(), "settings.json"))
	app, _ := NewApp(store, "templates", "static")
	body := `{"testWordsPerList":101,"lessonPlan":{"beginnerDays":2,"beginner":{"copy":3,"letterBuilder":3,"guided":3,"spell":0},"advanced":{"copy":0,"letterBuilder":0,"guided":3,"spell":3}},"lists":[{"title":"List","words":["word"]}]}`
	req := httptest.NewRequest(http.MethodPost, "/api/config", strings.NewReader(body))
	rec := httptest.NewRecorder()
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
}

func TestEmbeddedAppIncludesPagesAndStaticAssets(t *testing.T) {
	store, err := NewStore(filepath.Join(t.TempDir(), "settings.json"))
	if err != nil {
		t.Fatal(err)
	}
	app, err := NewEmbeddedApp(store)
	if err != nil {
		t.Fatal(err)
	}
	for _, test := range []struct {
		path        string
		contentType string
		contains    string
	}{
		{path: "/", contentType: "text/html", contains: "Spelling B"},
		{path: "/static/app.css", contentType: "text/css", contains: ".practice-card"},
		{path: "/static/practice.js", contentType: "text/javascript", contains: "planForDay"},
		{path: "/progress", contentType: "text/html", contains: "Session stars"},
		{path: "/settings", contentType: "text/html", contains: "Export classroom setup"},
		{path: "/static/settings.js", contentType: "text/javascript", contains: "spelling-b-classroom"},
		{path: "/static/import-data.js", contentType: "text/javascript", contains: "readXlsx"},
		{path: "/static/metrics.js", contentType: "text/javascript", contains: "copySpeed"},
		{path: "/high-frequency", contentType: "text/html", contains: "High Frequency Words"},
		{path: "/phonics", contentType: "text/html", contains: "Phonics lessons"},
		{path: "/typing", contentType: "text/html", contains: "Typing trail"},
		{path: "/static/high-frequency-words.json", contentType: "application/json", contains: "\"levels\":"},
		{path: "/static/phonics-lessons.json", contentType: "application/json", contains: "\"lessons\":"},
	} {
		recorder := httptest.NewRecorder()
		app.Handler().ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, test.path, nil))
		if recorder.Code != http.StatusOK {
			t.Fatalf("%s status = %d", test.path, recorder.Code)
		}
		if !strings.Contains(recorder.Header().Get("Content-Type"), test.contentType) {
			t.Fatalf("%s content type = %q", test.path, recorder.Header().Get("Content-Type"))
		}
		if !strings.Contains(recorder.Body.String(), test.contains) {
			t.Fatalf("%s did not contain %q", test.path, test.contains)
		}
	}
}

func TestLessonPlanValidation(t *testing.T) {
	tests := []struct {
		name    string
		plan    LessonPlan
		wantErr bool
	}{
		{name: "defaults", plan: defaultConfig.LessonPlan},
		{name: "zero disables individual lessons", plan: LessonPlan{BeginnerDays: 1, Beginner: LessonRepetitions{LetterBuilder: 2}, Advanced: LessonRepetitions{Spell: 1}}},
		{name: "zero beginner days allows empty beginner mode", plan: LessonPlan{Advanced: LessonRepetitions{Guided: 1}}},
		{name: "active beginner mode cannot be empty", plan: LessonPlan{BeginnerDays: 1, Advanced: LessonRepetitions{Spell: 1}}, wantErr: true},
		{name: "advanced mode cannot be empty", plan: LessonPlan{BeginnerDays: 1, Beginner: LessonRepetitions{Copy: 1}}, wantErr: true},
		{name: "negative repetition", plan: LessonPlan{Beginner: LessonRepetitions{Copy: -1}, Advanced: LessonRepetitions{Spell: 1}}, wantErr: true},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			err := validateLessonPlan(test.plan)
			if (err != nil) != test.wantErr {
				t.Fatalf("validateLessonPlan() error = %v, wantErr %v", err, test.wantErr)
			}
		})
	}
}

func TestCustomLessonPlanPersists(t *testing.T) {
	path := filepath.Join(t.TempDir(), "settings.json")
	store, err := NewStore(path)
	if err != nil {
		t.Fatal(err)
	}
	plan := LessonPlan{
		BeginnerDays: 7,
		Beginner:     LessonRepetitions{Copy: 0, LetterBuilder: 4, Guided: 2, Spell: 0},
		Advanced:     LessonRepetitions{Copy: 0, LetterBuilder: 0, Guided: 1, Spell: 5},
	}
	config := Config{Lists: []WordList{{Title: "Custom", Words: []string{"word"}}}, TestWordsPerList: 1, LessonPlan: plan}
	if err := store.Save(config); err != nil {
		t.Fatal(err)
	}
	reloaded, err := NewStore(path)
	if err != nil {
		t.Fatal(err)
	}
	if got := reloaded.Get().LessonPlan; got != plan {
		t.Fatalf("lesson plan = %#v, want %#v", got, plan)
	}
}

func TestPhonicsDataHasAllLessons(t *testing.T) {
	data, err := os.ReadFile("static/phonics-lessons.json")
	if err != nil {
		t.Fatal(err)
	}
	var course struct {
		License string `json:"license"`
		Lessons []struct {
			Number         int      `json:"number"`
			Title          string   `json:"title"`
			Guide          string   `json:"guide"`
			Student        string   `json:"student"`
			Words          []string `json:"words"`
			PracticeGroups []struct {
				ID     string   `json:"id"`
				Title  string   `json:"title"`
				Source string   `json:"source"`
				Words  []string `json:"words"`
			} `json:"practiceGroups"`
		} `json:"lessons"`
	}
	if err := json.Unmarshal(data, &course); err != nil {
		t.Fatal(err)
	}
	if course.License != "CC BY-NC-SA 4.0" {
		t.Fatalf("license = %q", course.License)
	}
	if len(course.Lessons) != 120 {
		t.Fatalf("lesson count = %d", len(course.Lessons))
	}
	groupCount := 0
	for index, lesson := range course.Lessons {
		if lesson.Number != index+1 || lesson.Title == "" || lesson.Guide == "" || len(lesson.PracticeGroups) == 0 {
			t.Fatalf("lesson %d is incomplete: %#v", index+1, lesson)
		}
		for _, group := range lesson.PracticeGroups {
			groupCount++
			if group.ID == "" || group.Title == "" || group.Source == "" || len(group.Words) == 0 || len(group.Words) > 10 {
				t.Fatalf("lesson %d has invalid practice group: %#v", lesson.Number, group)
			}
		}
	}
	if groupCount != 160 {
		t.Fatalf("practice group count = %d, want 160", groupCount)
	}
}

func TestPhonicsTutorRegularExpressionsStayEscaped(t *testing.T) {
	script, err := os.ReadFile("static/phonics.js")
	if err != nil {
		t.Fatal(err)
	}
	source := string(script)
	for _, expression := range []string{
		`block.replace(/([A-Za-z])-\n([a-z])/g`,
		`replace(/\n+/g`,
		`block.split(/\n(?=\s*•)/)`,
		`replace(/^\s*•\s*/, '')`,
		`text.split(/\n\s*\n/)`,
	} {
		if !strings.Contains(source, expression) {
			t.Errorf("phonics.js is missing escaped expression %q", expression)
		}
	}
}

func TestHighFrequencyDataHasOneHundredLevels(t *testing.T) {
	data, err := os.ReadFile("static/high-frequency-words.json")
	if err != nil {
		t.Fatal(err)
	}
	var course struct {
		License string `json:"license"`
		Levels  []struct {
			Number    int      `json:"number"`
			StartRank int      `json:"startRank"`
			EndRank   int      `json:"endRank"`
			Words     []string `json:"words"`
		} `json:"levels"`
	}
	if err := json.Unmarshal(data, &course); err != nil {
		t.Fatal(err)
	}
	if course.License != "Public Domain" {
		t.Fatalf("license = %q", course.License)
	}
	if len(course.Levels) != 100 {
		t.Fatalf("level count = %d, want 100", len(course.Levels))
	}
	seen := make(map[string]bool)
	for index, level := range course.Levels {
		if level.Number != index+1 || level.StartRank != index*10+1 || level.EndRank != index*10+10 {
			t.Fatalf("level %d has invalid numbering: %#v", index+1, level)
		}
		if len(level.Words) != 10 {
			t.Fatalf("level %d has %d words", level.Number, len(level.Words))
		}
		for _, word := range level.Words {
			if word == "" || seen[word] {
				t.Fatalf("invalid or duplicate word %q in level %d", word, level.Number)
			}
			seen[word] = true
		}
	}
	if len(seen) != 1000 {
		t.Fatalf("unique word count = %d, want 1000", len(seen))
	}
}

func TestChromeManifestAvoidsUnsupportedFileHandlers(t *testing.T) {
	data, err := os.ReadFile("chrome/manifest.json")
	if err != nil {
		t.Fatal(err)
	}
	var manifest struct {
		VersionName string          `json:"version_name"`
		Permissions []string        `json:"permissions"`
		Extra       json.RawMessage `json:"file_handlers"`
	}
	if err := json.Unmarshal(data, &manifest); err != nil {
		t.Fatal(err)
	}
	if manifest.VersionName != "1.3.0" {
		t.Fatalf("version_name = %q", manifest.VersionName)
	}
	if len(manifest.Extra) != 0 {
		t.Fatal("file_handlers is ChromeOS-only and must not be included in the cross-platform extension")
	}
	if strings.Join(manifest.Permissions, ",") != "storage,tts" {
		t.Fatalf("permissions = %#v", manifest.Permissions)
	}
}

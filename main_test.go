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
	req.Header.Set("Content-Type", "application/json")
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
	for _, path := range []string{"/", "/settings", "/test", "/progress", "/stickers", "/high-frequency", "/phonics", "/typing"} {
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

func TestCopiedAIPromptIsExampleOnly(t *testing.T) {
	script, err := os.ReadFile("static/settings.js")
	if err != nil {
		t.Fatal(err)
	}
	source := string(script)
	start := strings.Index(source, "function externalSentencePrompt(words)")
	if start < 0 {
		t.Fatal("could not locate externalSentencePrompt")
	}
	end := strings.Index(source[start:], "function generationRecordsFromParsed")
	if end < 0 {
		t.Fatal("could not locate the end of externalSentencePrompt")
	}
	promptSource := source[start : start+end]
	if strings.Contains(promptSource, "Each mapping needs") || strings.Contains(promptSource, `"mappings"`) {
		t.Fatal("copied AI prompt still requests sound mappings")
	}
	if !strings.Contains(promptSource, `"sentence":"green swamp plants"`) || !strings.Contains(promptSource, "Do not add pronunciation or sound mappings") {
		t.Fatal("copied AI prompt does not clearly request sentence-only JSON")
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
	wantPlan := defaultConfig.LessonPlan
	wantPlan.AdvancedReview.Enabled = false
	if got := store.Get().LessonPlan; got != wantPlan {
		t.Fatalf("default lesson plan = %#v", got)
	}
	if got := store.Get().SentencePrompt; got != defaultSentencePrompt {
		t.Fatalf("default sentence prompt = %q", got)
	}
	if got := store.Get().SentenceSystemPrompt; got != defaultSentenceSystemPrompt {
		t.Fatalf("default sentence system prompt = %q", got)
	}
}

func TestConfigAPIRejectsInvalidTestLimit(t *testing.T) {
	store, _ := NewStore(filepath.Join(t.TempDir(), "settings.json"))
	app, _ := NewApp(store, "templates", "static")
	body := `{"testWordsPerList":101,"lessonPlan":{"beginnerDays":2,"beginner":{"copy":3,"letterBuilder":3,"guided":3,"spell":0},"advanced":{"copy":0,"letterBuilder":0,"guided":3,"spell":3}},"lists":[{"title":"List","words":["word"]}]}`
	req := httptest.NewRequest(http.MethodPost, "/api/config", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
}

func TestConfigAPIRejectsCrossOriginWrite(t *testing.T) {
	store, _ := NewStore(filepath.Join(t.TempDir(), "settings.json"))
	app, _ := NewApp(store, "templates", "static")
	body := `{"testWordsPerList":1,"lessonPlan":{"beginnerDays":0,"beginner":{"copy":0,"letterBuilder":0,"guided":0,"spell":0},"advanced":{"copy":1,"letterBuilder":0,"guided":0,"spell":0}},"lists":[{"title":"Changed","words":["word"]}]}`
	req := httptest.NewRequest(http.MethodPost, "http://spelling.test/api/config", strings.NewReader(body))
	req.Header.Set("Content-Type", "text/plain;charset=UTF-8")
	req.Header.Set("Origin", "https://evil.example")
	rec := httptest.NewRecorder()

	app.Handler().ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	if got := store.Get().Lists[0].Title; got != defaultConfig.Lists[0].Title {
		t.Fatalf("cross-origin request changed the stored list to %q", got)
	}
}

func TestConfigAPIRequiresJSONContentType(t *testing.T) {
	store, _ := NewStore(filepath.Join(t.TempDir(), "settings.json"))
	app, _ := NewApp(store, "templates", "static")
	req := httptest.NewRequest(http.MethodPost, "http://127.0.0.1:8080/api/config", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "text/plain")
	req.Header.Set("Origin", "http://127.0.0.1:8080")
	rec := httptest.NewRecorder()

	app.Handler().ServeHTTP(rec, req)

	if rec.Code != http.StatusUnsupportedMediaType {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
}

func TestConfigAPIAllowsSameOriginWrite(t *testing.T) {
	store, _ := NewStore(filepath.Join(t.TempDir(), "settings.json"))
	app, _ := NewApp(store, "templates", "static")
	body := `{"testWordsPerList":1,"lessonPlan":{"beginnerDays":0,"beginner":{"copy":0,"letterBuilder":0,"guided":0,"spell":0},"advanced":{"copy":1,"letterBuilder":0,"guided":0,"spell":0}},"lists":[{"title":"Same origin","words":["word"]}]}`
	req := httptest.NewRequest(http.MethodPost, "http://127.0.0.1:8080/api/config", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json; charset=utf-8")
	req.Header.Set("Origin", "http://127.0.0.1:8080")
	rec := httptest.NewRecorder()

	app.Handler().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
}

func TestConfigAPIRejectsDNSRebindingOrigin(t *testing.T) {
	store, _ := NewStore(filepath.Join(t.TempDir(), "settings.json"))
	app, _ := NewApp(store, "templates", "static")
	req := httptest.NewRequest(http.MethodPost, "http://attacker.example/api/config", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Origin", "http://attacker.example")
	rec := httptest.NewRecorder()

	app.Handler().ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
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
		{path: "/stickers", contentType: "text/html", contains: "My Sticker Book"},
		{path: "/progress", contentType: "text/html", contains: "Export teacher CSV"},
		{path: "/static/stickers.js", contentType: "text/javascript", contains: "renderStickerBook"},
		{path: "/settings", contentType: "text/html", contains: "advanced-review-enabled"},
		{path: "/static/practice.js", contentType: "text/javascript", contains: "missedSpellWords"},
		{path: "/static/settings.js", contentType: "text/javascript", contains: "migrateListProgress"},
		{path: "/settings", contentType: "text/html", contains: "Export classroom setup"},
		{path: "/settings", contentType: "text/html", contains: "Download the language model?"},
		{path: "/settings", contentType: "text/html", contains: "export-sentences"},
		{path: "/settings", contentType: "text/html", contains: "settings-panel-guides"},
		{path: "/settings", contentType: "text/html", contains: "speech-normal-rate"},
		{path: "/settings", contentType: "text/html", contains: "Copy AI prompt"},
		{path: "/settings", contentType: "text/html", contains: "typing-practice-repetitions"},
		{path: "/static/runtime.js", contentType: "text/javascript", contains: "captureTextInput"},
		{path: "/static/runtime.js", contentType: "text/javascript", contains: "requestSubmit(submitter)"},
		{path: "/static/runtime.js", contentType: "text/javascript", contains: "closest('.speaker')"},
		{path: "/static/settings.js", contentType: "text/javascript", contains: "spelling-b-classroom"},
		{path: "/static/import-data.js", contentType: "text/javascript", contains: "readXlsx"},
		{path: "/static/metrics.js", contentType: "text/javascript", contains: "copySpeed"},
		{path: "/static/sound-spelling-lookup.js", contentType: "text/javascript", contains: "SpellingSoundLookup"},
		{path: "/static/sound-mastery.js", contentType: "text/javascript", contains: "WORDS_FOR_MASTERY"},
		{path: "/high-frequency", contentType: "text/html", contains: "High Frequency Words"},
		{path: "/high-frequency", contentType: "text/html", contains: "frequency-answer-field"},
		{path: "/phonics", contentType: "text/html", contains: "Sound Patterns"},
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
		{name: "review enabled with spell", plan: LessonPlan{Advanced: LessonRepetitions{Spell: 1}, AdvancedReview: ReviewSettings{Enabled: true, Repetitions: 2, MaxWords: 4}}},
		{name: "review requires spell", plan: LessonPlan{Advanced: LessonRepetitions{Guided: 1}, AdvancedReview: ReviewSettings{Enabled: true, Repetitions: 1, MaxWords: 5}}, wantErr: true},
		{name: "review repetitions capped", plan: LessonPlan{Advanced: LessonRepetitions{Spell: 1}, AdvancedReview: ReviewSettings{Enabled: true, Repetitions: 11, MaxWords: 5}}, wantErr: true},
		{name: "review words capped", plan: LessonPlan{Advanced: LessonRepetitions{Spell: 1}, AdvancedReview: ReviewSettings{Enabled: true, Repetitions: 1, MaxWords: 51}}, wantErr: true},
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
		BeginnerDays:   7,
		Beginner:       LessonRepetitions{Copy: 0, LetterBuilder: 4, Guided: 2, Spell: 0},
		Advanced:       LessonRepetitions{Copy: 0, LetterBuilder: 0, Guided: 1, Spell: 5},
		AdvancedReview: ReviewSettings{Repetitions: 1, MaxWords: 5},
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

func TestLegacySettingsGainStableListIDsAndDisabledReview(t *testing.T) {
	path := filepath.Join(t.TempDir(), "settings.json")
	legacy := `{"testWordsPerList":2,"lessonPlan":{"beginnerDays":0,"beginner":{"copy":0,"letterBuilder":0,"guided":0,"spell":0},"advanced":{"copy":0,"letterBuilder":0,"guided":1,"spell":0}},"lists":[{"title":"Legacy","words":["word"]}]}`
	if err := os.WriteFile(path, []byte(legacy), 0644); err != nil {
		t.Fatal(err)
	}
	store, err := NewStore(path)
	if err != nil {
		t.Fatal(err)
	}
	config := store.Get()
	if config.Lists[0].ID == "" {
		t.Fatal("legacy list did not receive an ID")
	}
	if config.LessonPlan.AdvancedReview.Enabled || config.LessonPlan.AdvancedReview.Repetitions != 1 || config.LessonPlan.AdvancedReview.MaxWords != 5 {
		t.Fatalf("legacy review settings = %#v", config.LessonPlan.AdvancedReview)
	}
	reloaded, err := NewStore(path)
	if err != nil {
		t.Fatal(err)
	}
	if reloaded.Get().Lists[0].ID != config.Lists[0].ID {
		t.Fatal("migrated list ID changed after reload")
	}
}

func TestDuplicateListIDsAreReplaced(t *testing.T) {
	store, err := NewStore(filepath.Join(t.TempDir(), "settings.json"))
	if err != nil {
		t.Fatal(err)
	}
	config := Config{
		Lists: []WordList{
			{ID: "shared", Title: "One", Words: []string{"one"}},
			{ID: "shared", Title: "Two", Words: []string{"two"}},
		},
		TestWordsPerList: 1,
		LessonPlan:       defaultConfig.LessonPlan,
	}
	if err := store.Save(config); err != nil {
		t.Fatal(err)
	}
	lists := store.Get().Lists
	if lists[0].ID == "" || lists[1].ID == "" || lists[0].ID == lists[1].ID {
		t.Fatalf("list IDs were not normalized: %#v", lists)
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

func TestSoundPatternsPageKeepsCuratedPracticeGuardrails(t *testing.T) {
	script, err := os.ReadFile("static/phonics.js")
	if err != nil {
		t.Fatal(err)
	}
	source := string(script)
	for _, expression := range []string{
		`pattern.words.slice(0, mastery.WORDS_FOR_MASTERY)`,
		`words.length >= 12`,
		`id: focusID`,
		`runtime.metricSessions()`,
	} {
		if !strings.Contains(source, expression) {
			t.Errorf("phonics.js is missing sound-pattern behavior %q", expression)
		}
	}
}

func TestProgressLimitsVisibleSoundPatterns(t *testing.T) {
	script, err := os.ReadFile("static/metrics.js")
	if err != nil {
		t.Fatal(err)
	}
	source := string(script)
	for _, expression := range []string{
		`const soundPatternDisplayLimit = 12`,
		`rankedSoundPatterns.slice(0, soundPatternDisplayLimit)`,
		`Show fewer patterns`,
	} {
		if !strings.Contains(source, expression) {
			t.Errorf("metrics.js is missing collapsed sound-pattern behavior %q", expression)
		}
	}

	runtimeScript, err := os.ReadFile("static/runtime.js")
	if err != nil {
		t.Fatal(err)
	}
	for _, label := range []string{"Prehistoric World", "Tech & Games"} {
		if !strings.Contains(string(runtimeScript), label) {
			t.Errorf("runtime.js is missing sticker pack label %q", label)
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
	lookup, err := os.ReadFile("static/sound-spelling-lookup.js")
	if err != nil {
		t.Fatal(err)
	}
	bank, err := os.ReadFile("static/sound-spelling-bank.js")
	if err != nil {
		t.Fatal(err)
	}
	covered := 0
	var unmapped []string
	lookupSource := string(lookup)
	bankSource := string(bank)
	for word := range seen {
		if strings.Contains(lookupSource, `"`+word+`"`) || strings.Contains(bankSource, `'`+word+`'`) {
			covered++
		} else {
			unmapped = append(unmapped, word)
		}
	}
	if covered < 990 {
		t.Fatalf("only %d of 1000 high-frequency words have reviewed sound mappings; unmapped includes %v", covered, unmapped[:min(10, len(unmapped))])
	}
}

func TestHighFrequencyUsesCumulativeAndSoundMastery(t *testing.T) {
	script, err := os.ReadFile("static/high-frequency.js")
	if err != nil {
		t.Fatal(err)
	}
	source := string(script)
	for _, behavior := range []string{
		`mastery: saved.mastery`,
		`soundMastery.weightFor(stage)`,
		`phonetics: phoneticsForWord(currentWord())`,
		`soundMasteryBackfillVersion`,
		`score >= 100`,
	} {
		if !strings.Contains(source, behavior) {
			t.Errorf("high-frequency.js is missing mastery behavior %q", behavior)
		}
	}
}

func TestMasteredProfileFixtureIsCompleteAndNotPackaged(t *testing.T) {
	data, err := os.ReadFile("test_data/mastered-spelling-b.spellingb-profile")
	if err != nil {
		t.Fatal(err)
	}
	if len(data) > 8*1024*1024 {
		t.Fatalf("mastered profile is %d bytes; profile imports are limited to 8 MB", len(data))
	}
	var profile struct {
		Format      string                     `json:"format"`
		Version     int                        `json:"version"`
		Profile     struct{ Name string }      `json:"profile"`
		LearnerData map[string]json.RawMessage `json:"learnerData"`
		WordLists   []WordList                 `json:"wordLists"`
	}
	if err := json.Unmarshal(data, &profile); err != nil {
		t.Fatal(err)
	}
	if profile.Format != "spelling-b-profile" || profile.Version != 1 || profile.Profile.Name == "" || len(profile.WordLists) != 1 {
		t.Fatalf("invalid mastered profile envelope: format=%q version=%d name=%q lists=%d", profile.Format, profile.Version, profile.Profile.Name, len(profile.WordLists))
	}
	allowedKeys := map[string]bool{
		"spelling-b:session-metrics:v1": true, "spelling-b:stickers:v1": true,
		"spelling-b:current-word-list:v1": true, "spelling-b:high-frequency-progress:v1": true,
		"spelling-b:phonics-progress:v3": true, "spelling-b:typing-progress:v2": true,
		"spelling-b:list:mastered-profile-test-words:progress:v1": true,
	}
	for key := range profile.LearnerData {
		if !allowedKeys[key] {
			t.Fatalf("fixture contains unsupported learner-data key %q", key)
		}
	}

	var sessions []struct {
		SoundMastery map[string]json.RawMessage `json:"soundMastery"`
	}
	if err := json.Unmarshal(profile.LearnerData["spelling-b:session-metrics:v1"], &sessions); err != nil {
		t.Fatal(err)
	}
	trackedPatterns := 0
	for _, session := range sessions {
		trackedPatterns += len(session.SoundMastery)
	}
	if len(sessions) > 250 || trackedPatterns != 98 {
		t.Fatalf("fixture sessions=%d tracked sound patterns=%d", len(sessions), trackedPatterns)
	}

	var stickers struct {
		Earned map[string][]int `json:"earned"`
	}
	if err := json.Unmarshal(profile.LearnerData["spelling-b:stickers:v1"], &stickers); err != nil {
		t.Fatal(err)
	}
	totalStickers := 0
	for _, earned := range stickers.Earned {
		totalStickers += len(earned)
	}
	if len(stickers.Earned) != 20 || totalStickers != 200 {
		t.Fatalf("fixture sticker packs=%d stickers=%d", len(stickers.Earned), totalStickers)
	}

	var frequency struct {
		Completed []int                      `json:"completed"`
		Mastery   map[string]json.RawMessage `json:"mastery"`
	}
	if err := json.Unmarshal(profile.LearnerData["spelling-b:high-frequency-progress:v1"], &frequency); err != nil {
		t.Fatal(err)
	}
	if len(frequency.Completed) != 100 || len(frequency.Mastery) != 100 {
		t.Fatalf("fixture high-frequency completed=%d mastery records=%d", len(frequency.Completed), len(frequency.Mastery))
	}

	var typing struct {
		Unlocked int    `json:"unlocked"`
		Mastered []bool `json:"mastered"`
		Best     []struct {
			CPM float64 `json:"cpm"`
		} `json:"best"`
	}
	if err := json.Unmarshal(profile.LearnerData["spelling-b:typing-progress:v2"], &typing); err != nil {
		t.Fatal(err)
	}
	if typing.Unlocked != 6 || len(typing.Mastered) != 7 || len(typing.Best) != 7 {
		t.Fatalf("fixture typing unlocked=%d mastered=%d best=%d", typing.Unlocked, len(typing.Mastered), len(typing.Best))
	}
	for index := range typing.Mastered {
		if !typing.Mastered[index] || typing.Best[index].CPM < 60 {
			t.Fatalf("typing level %d is not mastered with a passing score", index+1)
		}
	}

	var phonics struct {
		Completed []string `json:"completed"`
	}
	if err := json.Unmarshal(profile.LearnerData["spelling-b:phonics-progress:v3"], &phonics); err != nil {
		t.Fatal(err)
	}
	if len(phonics.Completed) != 160 {
		t.Fatalf("fixture legacy phonics completed=%d, want 160", len(phonics.Completed))
	}

	var wordProgress struct {
		Completed bool `json:"completed"`
	}
	if err := json.Unmarshal(profile.LearnerData["spelling-b:list:mastered-profile-test-words:progress:v1"], &wordProgress); err != nil {
		t.Fatal(err)
	}
	if !wordProgress.Completed {
		t.Fatal("fixture Word List day is not complete")
	}

	buildScript, err := os.ReadFile("scripts/build-extension.sh")
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(buildScript), "test_data") {
		t.Fatal("extension build script references test_data")
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
	if manifest.VersionName != "1.6.0" {
		t.Fatalf("version_name = %q", manifest.VersionName)
	}
	if len(manifest.Extra) != 0 {
		t.Fatal("file_handlers is ChromeOS-only and must not be included in the cross-platform extension")
	}
	if strings.Join(manifest.Permissions, ",") != "storage,tts" {
		t.Fatalf("permissions = %#v", manifest.Permissions)
	}
}

func TestStoreSaveCleansAndPersistsSentences(t *testing.T) {
	path := filepath.Join(t.TempDir(), "settings.json")
	store, err := NewStore(path)
	if err != nil {
		t.Fatal(err)
	}
	config := Config{
		Lists: []WordList{{
			Title: "Examples",
			Words: []string{" Apple ", "pear"},
			Sentences: map[string]string{
				"apple":  "  The apple is red.  ",
				"PEAR":   "I ate a pear.",
				"unused": "This should be removed.",
			},
			Phonetics: map[string]WordPhonetics{
				"apple": {
					Pronunciation: " /ˈæpəl/ ",
					Mappings: []SoundMapping{
						{Sound: " /æ/ ", Letters: "a", Start: 0, End: 1},
						{Sound: "/p/", Letters: "pp", Start: 1, End: 3},
						{Sound: "/əl/", Letters: "le", Start: 3, End: 5},
					},
				},
				"unused": {Pronunciation: "/x/", Mappings: []SoundMapping{{Sound: "/x/", Letters: "unused", Start: 0, End: 6}}},
			},
		}},
		TestWordsPerList:     2,
		LessonPlan:           defaultConfig.LessonPlan,
		SentencePrompt:       "  Use playful animal examples.  ",
		SentenceSystemPrompt: "  Follow the teacher exactly.  ",
	}
	if err := store.Save(config); err != nil {
		t.Fatal(err)
	}

	// Mutating a returned configuration must not mutate the store's maps.
	got := store.Get()
	got.Lists[0].Sentences["Apple"] = "Changed outside the store."
	if sentence := store.Get().Lists[0].Sentences["Apple"]; sentence != "The apple is red." {
		t.Fatalf("stored sentence changed through Get(): %q", sentence)
	}
	got.Lists[0].Phonetics["Apple"] = WordPhonetics{Pronunciation: "changed"}
	if pronunciation := store.Get().Lists[0].Phonetics["Apple"].Pronunciation; pronunciation != "/ˈæpəl/" {
		t.Fatalf("stored phonetics changed through Get(): %q", pronunciation)
	}

	reloaded, err := NewStore(path)
	if err != nil {
		t.Fatal(err)
	}
	if prompt := reloaded.Get().SentencePrompt; prompt != "Use playful animal examples." {
		t.Fatalf("sentence prompt = %q", prompt)
	}
	if prompt := reloaded.Get().SentenceSystemPrompt; prompt != "Follow the teacher exactly." {
		t.Fatalf("sentence system prompt = %q", prompt)
	}
	sentences := reloaded.Get().Lists[0].Sentences
	if len(sentences) != 2 {
		t.Fatalf("sentences = %#v", sentences)
	}
	if sentences["Apple"] != "The apple is red." || sentences["pear"] != "I ate a pear." {
		t.Fatalf("sentences = %#v", sentences)
	}
	if _, exists := sentences["unused"]; exists {
		t.Fatalf("sentence for removed word was persisted: %#v", sentences)
	}
	phonetics := reloaded.Get().Lists[0].Phonetics
	if len(phonetics) != 1 {
		t.Fatalf("phonetics = %#v", phonetics)
	}
	if phonetics["Apple"].Pronunciation != "/ˈæpəl/" || len(phonetics["Apple"].Mappings) != 3 {
		t.Fatalf("phonetics = %#v", phonetics)
	}
	firstMapping := phonetics["Apple"].Mappings[0]
	if firstMapping.Sound != "" || len(firstMapping.Phonemes) != 1 || firstMapping.Phonemes[0] != "/æ/" {
		t.Fatalf("legacy sound mapping was not migrated to phonemes: %#v", firstMapping)
	}
	if _, exists := phonetics["unused"]; exists {
		t.Fatalf("phonetics for removed word were persisted: %#v", phonetics)
	}
}

func TestConfigRejectsOverlongSentence(t *testing.T) {
	config := Config{
		Lists: []WordList{{
			Title:     "Examples",
			Words:     []string{"apple"},
			Sentences: map[string]string{"apple": strings.Repeat("a", 301)},
		}},
		TestWordsPerList: 1,
		LessonPlan:       defaultConfig.LessonPlan,
	}
	if err := validateConfig(config); err == nil {
		t.Fatal("validateConfig() accepted an overlong sentence")
	}
}

func TestConfigRejectsOverlongSentencePrompt(t *testing.T) {
	config := Config{
		Lists:            []WordList{{Title: "Examples", Words: []string{"apple"}}},
		TestWordsPerList: 1,
		LessonPlan:       defaultConfig.LessonPlan,
		SentencePrompt:   strings.Repeat("a", 2001),
	}
	if err := validateConfig(config); err == nil {
		t.Fatal("validateConfig() accepted an overlong sentence-generation prompt")
	}
}
func TestConfigRejectsInvalidSoundMapping(t *testing.T) {
	config := Config{
		Lists: []WordList{{
			Title: "Examples",
			Words: []string{"school"},
			Phonetics: map[string]WordPhonetics{
				"school": {
					Pronunciation: "/skuːl/",
					Mappings:      []SoundMapping{{Sound: "/s/", Letters: "x", Start: 0, End: 1}},
				},
			},
		}},
		TestWordsPerList: 1,
		LessonPlan:       defaultConfig.LessonPlan,
	}
	if err := validateConfig(config); err == nil {
		t.Fatal("validateConfig() accepted an invalid sound mapping")
	}
}

func TestConfigRejectsOverlongSentenceSystemPrompt(t *testing.T) {
	config := Config{
		Lists:                []WordList{{Title: "Examples", Words: []string{"apple"}}},
		TestWordsPerList:     1,
		LessonPlan:           defaultConfig.LessonPlan,
		SentenceSystemPrompt: strings.Repeat("a", 4001),
	}
	if err := validateConfig(config); err == nil {
		t.Fatal("validateConfig() accepted an overlong sentence-generation system prompt")
	}
}

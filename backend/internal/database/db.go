package database

import (
	"database/sql"
	"os"
	"strings"

	_ "github.com/tursodatabase/libsql-client-go/libsql"
	_ "modernc.org/sqlite"
)

func Initialize() (*sql.DB, error) {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		databaseURL = "file:./data/qr_tracker.db"
	}

	// Convert old sqlite:// URLs to libsql file: format
	if strings.HasPrefix(databaseURL, "sqlite://") {
		databaseURL = strings.Replace(databaseURL, "sqlite://", "file:", 1)
	}

	db, err := sql.Open("libsql", databaseURL)
	if err != nil {
		return nil, err
	}

	if err := createTables(db); err != nil {
		return nil, err
	}

	return db, nil
}

func createTables(db *sql.DB) error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS qr_codes (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			code TEXT UNIQUE NOT NULL,
			title TEXT NOT NULL,
			target_url TEXT NOT NULL,
			background_color TEXT DEFAULT '#FFFFFF',
			foreground_color TEXT DEFAULT '#000000',
			size INTEGER DEFAULT 256,
			logo_path TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS qr_scans (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			qr_code_id INTEGER NOT NULL,
			ip_address TEXT,
			user_agent TEXT,
			country TEXT,
			city TEXT,
			browser TEXT,
			device_type TEXT,
			scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (qr_code_id) REFERENCES qr_codes (id) ON DELETE CASCADE
		)`,
		`CREATE INDEX IF NOT EXISTS idx_qr_scans_qr_code_id ON qr_scans(qr_code_id)`,
		`CREATE INDEX IF NOT EXISTS idx_qr_scans_scanned_at ON qr_scans(scanned_at)`,
	}

	for _, query := range queries {
		if _, err := db.Exec(query); err != nil {
			return err
		}
	}

	return nil
}

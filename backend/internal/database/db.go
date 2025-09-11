package database

import (
	"database/sql"
	"os"
	"strings"

	"github.com/GridexX/qr-tracker/internal/utils"
	_ "github.com/tursodatabase/libsql-client-go/libsql"
	_ "modernc.org/sqlite"
)

func Initialize() (*sql.DB, error) {
	databaseURL := os.Getenv("DATABASE_URL")
	adminUsername := os.Getenv("ADMIN_USERNAME")
	adminPassword := os.Getenv("ADMIN_PASSWORD")

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

	adminPasswordHash, err := utils.HashPassword(adminPassword)
	if err != nil {
		return nil, err
	}

	if err := createAdminAccount(db, adminUsername, adminPasswordHash); err != nil {
		return nil, err
	}

	return db, nil
}

func createAdminAccount(db *sql.DB, username, passwordHash string) error {
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE username = ?)", username).Scan(&exists)
	if err != nil {
		return err
	}
	if exists {
		return nil // Admin account already exists
	}

	_, err = db.Exec("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)", username, passwordHash, "admin")
	return err
}

func createTables(db *sql.DB) error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS qr_codes (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			code TEXT UNIQUE NOT NULL,
			user_id INTEGER NOT NULL,
			title TEXT NOT NULL,
			target_url TEXT NOT NULL,
			background_color TEXT DEFAULT '#FFFFFF',
			foreground_color TEXT DEFAULT '#000000',
			size INTEGER DEFAULT 256,
			logo_path TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
		`CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT UNIQUE NOT NULL,
			password_hash TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			role TEXT DEFAULT 'user'
		)`,
		`CREATE INDEX IF NOT EXISTS idx_qr_scans_qr_code_id ON qr_scans(qr_code_id)`,
		`CREATE INDEX IF NOT EXISTS idx_qr_scans_scanned_at ON qr_scans(scanned_at)`,
		`CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)`,
	}

	for _, query := range queries {
		if _, err := db.Exec(query); err != nil {
			return err
		}
	}

	return nil
}

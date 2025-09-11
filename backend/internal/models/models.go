package models

import "time"

type QRCode struct {
	ID              int       `json:"id"`
	Code            string    `json:"code"`
	Title           string    `json:"title"`
	TargetURL       string    `json:"target_url"`
	BackgroundColor string    `json:"background_color"`
	ForegroundColor string    `json:"foreground_color"`
	Size            int       `json:"size"`
	LogoPath        string    `json:"logo_path,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
	TotalScans      int       `json:"total_scans,omitempty"`
}

type QRScan struct {
	ID         int       `json:"id"`
	QRCodeID   int       `json:"qr_code_id"`
	IPAddress  string    `json:"ip_address"`
	UserAgent  string    `json:"user_agent"`
	Country    string    `json:"country,omitempty"`
	City       string    `json:"city,omitempty"`
	Browser    string    `json:"browser,omitempty"`
	DeviceType string    `json:"device_type,omitempty"`
	ScannedAt  time.Time `json:"scanned_at"`
}

type CreateQRRequest struct {
	Title           string `json:"title" binding:"required"`
	TargetURL       string `json:"target_url" binding:"required"`
	BackgroundColor string `json:"background_color"`
	ForegroundColor string `json:"foreground_color"`
	Size            int    `json:"size"`
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type User struct {
	ID        int       `json:"id"`
	Username  string    `json:"username"`
	CreatedAt time.Time `json:"created_at"`
}

type LoginResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type SigninResponse struct {
	User User `json:"user"`
}

type SigninRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type AnalyticsOverview struct {
	TotalQRCodes   int `json:"total_qr_codes"`
	TotalScans     int `json:"total_scans"`
	ScansToday     int `json:"scans_today"`
	ScansThisWeek  int `json:"scans_this_week"`
	ScansThisMonth int `json:"scans_this_month"`
}

type TimeSeriesData struct {
	Date  string `json:"date"`
	Scans int    `json:"scans"`
}

type QRAnalytics struct {
	QRCode      QRCode           `json:"qr_code"`
	TotalScans  int              `json:"total_scans"`
	RecentScans []QRScan         `json:"recent_scans"`
	TimeSeries  []TimeSeriesData `json:"time_series"`
}

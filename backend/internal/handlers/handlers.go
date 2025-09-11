package handlers

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/GridexX/qr-tracker/internal/models"
	"github.com/GridexX/qr-tracker/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/skip2/go-qrcode"
)

type Handler struct {
	db *sql.DB
}

func NewHandler(db *sql.DB) *Handler {
	return &Handler{db: db}
}

func generateUniqueCode() (string, error) {
	bytes := make([]byte, 4)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

func (h *Handler) findUser(username string) (*models.User, error) {
	var existingUser models.User
	query := `SELECT id, username, created_at FROM users WHERE username = ?`
	err := h.db.QueryRow(query, username).Scan(&existingUser.ID, &existingUser.Username, &existingUser.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		} else {
			return nil, err
		}
	}
	return &existingUser, nil
}

func (h *Handler) Signin(c *gin.Context) {
	var req models.SigninRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Ensure the username is not already taken
	var existingUser *models.User
	existingUser, err := h.findUser(req.Username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not check username availability"})
		return
	}

	if existingUser != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Username is already taken"})
		return
	}

	encryptedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not hash password"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not generate user code"})
		return
	}

	query := `INSERT INTO users (username, password_hash) VALUES (?, ?)`
	_, err = h.db.Exec(query, req.Username, encryptedPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not create user"})
		return
	}
	existingUser, err = h.findUser(req.Username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not retrieve created user"})
		return
	}
	c.JSON(http.StatusCreated, models.SigninResponse{User: *existingUser})
}

func (h *Handler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	query := `
		SELECT u.id, u.username, u.created_at, u.password_hash
		FROM users u
		WHERE u.username = ?
	`

	var user models.User
	var userPasswordHash string
	if err := h.db.QueryRow(query, req.Username).Scan(&user.ID, &user.Username, &user.CreatedAt, &userPasswordHash); err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not retrieve user"})
		return
	}

	passwordMatches := utils.CheckPasswordHash(req.Password, userPasswordHash)
	if !passwordMatches {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Create a user response
	userResponse := models.User{
		ID:        user.ID,
		Username:  user.Username,
		CreatedAt: user.CreatedAt,
	}

	// Generate JWT token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"username": userResponse.Username,
		"userID":   userResponse.ID,
		"exp":      time.Now().Add(time.Hour * 24).Unix(),
	})

	jwtSecret := os.Getenv("JWT_SECRET")
	tokenString, err := token.SignedString([]byte(jwtSecret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not generate token"})
		return
	}

	c.JSON(http.StatusOK, models.LoginResponse{
		Token: tokenString,
		User:  userResponse,
	})
}

func (h *Handler) CreateQR(c *gin.Context) {
	// Retrieve the user from the JWT claims in the context (set by AuthMiddleware)
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req models.CreateQRRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Set defaults
	if req.BackgroundColor == "" {
		req.BackgroundColor = "#FFFFFF"
	}
	if req.ForegroundColor == "" {
		req.ForegroundColor = "#000000"
	}
	if req.Size == 0 {
		req.Size = 256
	}

	// Generate unique code
	code, err := generateUniqueCode()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not generate QR code"})
		return
	}

	// Insert into database
	query := `INSERT INTO qr_codes (code, title, target_url, background_color, foreground_color, size, user_id) 
			  VALUES (?, ?, ?, ?, ?, ?,?)`
	result, err := h.db.Exec(query, code, req.Title, req.TargetURL, req.BackgroundColor, req.ForegroundColor, req.Size, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not create QR code"})
		return
	}

	id, _ := result.LastInsertId()

	// Generate QR code image
	baseURL := os.Getenv("BASE_URL")
	redirectURL := fmt.Sprintf("%s/r/%s", baseURL, code)

	qr, err := qrcode.New(redirectURL, qrcode.Medium)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not generate QR image"})
		return
	}

	// Create QR code directory if it doesn't exist
	os.MkdirAll("./data/qr_images", 0755)

	imagePath := fmt.Sprintf("./data/qr_images/%s.png", code)
	err = qr.WriteFile(req.Size, imagePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not save QR image"})
		return
	}

	qrCode := models.QRCode{
		ID:              int(id),
		Code:            code,
		Title:           req.Title,
		TargetURL:       req.TargetURL,
		BackgroundColor: req.BackgroundColor,
		ForegroundColor: req.ForegroundColor,
		Size:            req.Size,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	c.JSON(http.StatusOK, qrCode)
}

func (h *Handler) ListQR(c *gin.Context) {

	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	query := `
		SELECT q.id, q.code, q.title, q.target_url, q.background_color, q.foreground_color, 
			   q.size, q.logo_path, q.created_at, q.updated_at, COALESCE(COUNT(s.id), 0) as total_scans, q.user_id
		FROM qr_codes q 
		LEFT JOIN qr_scans s ON q.id = s.qr_code_id 
		WHERE q.user_id = ?
		GROUP BY q.id, q.code, q.title, q.target_url, q.background_color, q.foreground_color, 
				 q.size, q.logo_path, q.created_at, q.updated_at, q.user_id
		ORDER BY q.created_at DESC
	`

	rows, err := h.db.Query(query, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not fetch QR codes"})
		return
	}
	defer rows.Close()

	var qrCodes []models.QRCode
	for rows.Next() {
		var qr models.QRCode
		var logoPath sql.NullString
		var userIDFromDB int // Add this to match the selected user_id field
		err := rows.Scan(&qr.ID, &qr.Code, &qr.Title, &qr.TargetURL, &qr.BackgroundColor,
			&qr.ForegroundColor, &qr.Size, &logoPath, &qr.CreatedAt, &qr.UpdatedAt, &qr.TotalScans, &userIDFromDB)
		if err != nil {
			continue
		}
		if logoPath.Valid {
			qr.LogoPath = logoPath.String
		}
		qrCodes = append(qrCodes, qr)
	}

	// Ensure we return an empty array instead of null
	if qrCodes == nil {
		qrCodes = []models.QRCode{}
	}

	c.JSON(http.StatusOK, qrCodes)
}

func (h *Handler) GetQR(c *gin.Context) {
	id := c.Param("id")

	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	query := `
		SELECT q.id, q.code, q.title, q.target_url, q.background_color, q.foreground_color, 
			   q.size, q.logo_path, q.created_at, q.updated_at, COALESCE(COUNT(s.id), 0) as total_scans
		FROM qr_codes q 
		LEFT JOIN qr_scans s ON q.id = s.qr_code_id 
		WHERE q.id = ? AND q.user_id = ?
		GROUP BY q.id, q.code, q.title, q.target_url, q.background_color, q.foreground_color, 
				 q.size, q.logo_path, q.created_at, q.updated_at
	`

	var qr models.QRCode
	var logoPath sql.NullString
	err := h.db.QueryRow(query, id, userID).Scan(&qr.ID, &qr.Code, &qr.Title, &qr.TargetURL,
		&qr.BackgroundColor, &qr.ForegroundColor, &qr.Size, &logoPath, &qr.CreatedAt, &qr.UpdatedAt, &qr.TotalScans)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "QR code not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not fetch QR code"})
		return
	}

	if logoPath.Valid {
		qr.LogoPath = logoPath.String
	}

	c.JSON(http.StatusOK, qr)
}

func (h *Handler) UpdateQR(c *gin.Context) {
	id := c.Param("id")
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	var req models.CreateQRRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	query := `UPDATE qr_codes SET title = ?, target_url = ?, background_color = ?, 
			  foreground_color = ?, size = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`

	result, err := h.db.Exec(query, req.Title, req.TargetURL, req.BackgroundColor,
		req.ForegroundColor, req.Size, id, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not update QR code"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "QR code not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "QR code updated successfully"})
}

func (h *Handler) DeleteQR(c *gin.Context) {
	id := c.Param("id")
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	// Get the QR code to delete associated files
	var code string
	err := h.db.QueryRow("SELECT code FROM qr_codes WHERE id = ? AND user_id = ?", id, userID).Scan(&code)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "QR code not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not fetch QR code"})
		return
	}

	// Delete from database
	result, err := h.db.Exec("DELETE FROM qr_codes WHERE id = ?", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not delete QR code"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "QR code not found"})
		return
	}

	// Delete associated image file
	imagePath := fmt.Sprintf("./data/qr_images/%s.png", code)
	os.Remove(imagePath)

	c.JSON(http.StatusOK, gin.H{"message": "QR code deleted successfully"})
}

func (h *Handler) RedirectQR(c *gin.Context) {
	code := c.Param("code")

	// Get QR code details
	var qrID int
	var targetURL string
	err := h.db.QueryRow("SELECT id, target_url FROM qr_codes WHERE code = ?", code).Scan(&qrID, &targetURL)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "QR code not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Get client information
	clientIP := utils.GetClientIP(c.Request)
	userAgent := c.GetHeader("User-Agent")
	browser, deviceType := utils.ParseUserAgent(userAgent)

	// Get geolocation
	country, city, _ := utils.GetGeolocation(clientIP)

	// Record the scan
	scanQuery := `INSERT INTO qr_scans (qr_code_id, ip_address, user_agent, country, city, browser, device_type) 
				  VALUES (?, ?, ?, ?, ?, ?, ?)`
	_, err = h.db.Exec(scanQuery, qrID, clientIP, userAgent, country, city, browser, deviceType)
	if err != nil {
		// Log error but don't fail the redirect
		fmt.Printf("Error recording scan: %v\n", err)
	}

	// Generate GTM tracking script if GTM_ID is configured
	gtmID := os.Getenv("GTM_ID")
	if gtmID != "" {
		// Return an HTML page with GTM tracking and redirect
		html := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <!-- Google Tag Manager -->
    <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','%s');</script>
    <!-- End Google Tag Manager -->
    <script>
        // Send GTM event
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
            'event': 'qr_code_scan',
            'qr_code_id': '%d',
            'qr_code': '%s',
            'target_url': '%s',
            'device_type': '%s',
            'browser': '%s'
        });
        
        // Redirect after a short delay
        setTimeout(function() {
            window.location.href = '%s';
        }, 100);
    </script>
</head>
<body>
    <!-- Google Tag Manager (noscript) -->
    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=%s"
    height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
    <!-- End Google Tag Manager (noscript) -->
    <p>Redirecting...</p>
</body>
</html>`, gtmID, qrID, code, targetURL, deviceType, browser, targetURL, gtmID)

		c.Header("Content-Type", "text/html")
		c.String(http.StatusOK, html)
		return
	}

	// Direct redirect if no GTM
	c.Redirect(http.StatusFound, targetURL)
}

func (h *Handler) GetAnalyticsOverview(c *gin.Context) {
	var overview models.AnalyticsOverview
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Total QR codes
	h.db.QueryRow("SELECT COUNT(*) FROM qr_codes WHERE user_id = ?", userID).Scan(&overview.TotalQRCodes)

	// Total scans
	h.db.QueryRow(`SELECT COUNT(*) 
	               FROM qr_scans
				   LEFT JOIN qr_codes ON qr_scans.qr_code_id = qr_codes.id
				   WHERE user_id = ?`, userID).Scan(&overview.TotalScans)

	// Scans today
	h.db.QueryRow(`SELECT COUNT(*) 
	               FROM qr_scans
				   LEFT JOIN qr_codes ON qr_scans.qr_code_id = qr_codes.id
				   WHERE DATE(scanned_at) = DATE('now') AND qr_codes.user_id = ?`, userID).Scan(&overview.ScansToday)

	// Scans this week
	h.db.QueryRow(`SELECT COUNT(*) 
	               FROM qr_scans
				   LEFT JOIN qr_codes ON qr_scans.qr_code_id = qr_codes.id
				   WHERE DATE(scanned_at) >= DATE('now', '-7 days') AND qr_codes.user_id = ?`, userID).Scan(&overview.ScansThisWeek)

	// Scans this month
	h.db.QueryRow(`SELECT COUNT(*) 
	               FROM qr_scans
				   LEFT JOIN qr_codes ON qr_scans.qr_code_id = qr_codes.id
				   WHERE DATE(scanned_at) >= DATE('now', 'start of month') AND qr_codes.user_id = ?`, userID).Scan(&overview.ScansThisMonth)

	c.JSON(http.StatusOK, overview)
}

func (h *Handler) GetQRAnalytics(c *gin.Context) {
	id := c.Param("id")
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	// Get QR code details
	var qr models.QRCode
	var logoPath sql.NullString
	qrQuery := `SELECT id, code, title, target_url, background_color, foreground_color, 
				 size, logo_path, created_at, updated_at FROM qr_codes WHERE id = ? AND user_id = ?`
	err := h.db.QueryRow(qrQuery, id, userID).Scan(&qr.ID, &qr.Code, &qr.Title, &qr.TargetURL,
		&qr.BackgroundColor, &qr.ForegroundColor, &qr.Size, &logoPath, &qr.CreatedAt, &qr.UpdatedAt)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "QR code not found"})
		return
	}
	if err != nil {
		log.Printf("Error in 1st query (%v): %v", err, qrQuery)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not fetch QR code"})
		return
	}

	if logoPath.Valid {
		qr.LogoPath = logoPath.String
	}

	// Get total scans
	var totalScans int
	err = h.db.QueryRow(`SELECT COUNT(*) 
				   FROM qr_scans
				   LEFT JOIN qr_codes ON qr_scans.qr_code_id = qr_codes.id
				   WHERE qr_code_id = ? AND qr_codes.user_id = ?`, id, userID).Scan(&totalScans)
	if err != nil {
		log.Printf("Error in 2nd query (%v)", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not fetch total scans"})
		return
	}
	// Get recent scans
	recentScansQuery := `SELECT qr_scans.id, qr_code_id, ip_address, user_agent, country, city, 
						 browser, device_type, scanned_at FROM qr_scans
						 LEFT JOIN qr_codes ON qr_scans.qr_code_id = qr_codes.id
						 WHERE qr_code_id = ? AND qr_codes.user_id = ? ORDER BY scanned_at DESC LIMIT 10`
	rows, err := h.db.Query(recentScansQuery, id, userID)
	if err != nil {
		log.Printf("Error in 3thr query (%v): %v", err, recentScansQuery)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not fetch recent scans"})
		return
	}
	defer rows.Close()

	var recentScans []models.QRScan
	for rows.Next() {
		var scan models.QRScan
		var country, city, browser, deviceType sql.NullString
		err := rows.Scan(&scan.ID, &scan.QRCodeID, &scan.IPAddress, &scan.UserAgent,
			&country, &city, &browser, &deviceType, &scan.ScannedAt)
		if err != nil {
			continue
		}
		if country.Valid {
			scan.Country = country.String
		}
		if city.Valid {
			scan.City = city.String
		}
		if browser.Valid {
			scan.Browser = browser.String
		}
		if deviceType.Valid {
			scan.DeviceType = deviceType.String
		}
		recentScans = append(recentScans, scan)
	}

	// Get time series data (last 30 days)
	timeSeriesQuery := `
		SELECT DATE(scanned_at) as date, COUNT(*) as scans 
		FROM qr_scans 
		LEFT JOIN qr_codes ON qr_scans.qr_code_id = qr_codes.id
		WHERE qr_code_id = ? AND scanned_at >= DATE('now', '-30 days') AND qr_codes.user_id = ?
		GROUP BY DATE(scanned_at) 
		ORDER BY date
	`
	timeRows, err := h.db.Query(timeSeriesQuery, id, userID)
	if err != nil {
		log.Printf("Error in 4th query (%v): %v", err, timeSeriesQuery)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not fetch time series data"})
		return
	}
	defer timeRows.Close()

	var timeSeries []models.TimeSeriesData
	for timeRows.Next() {
		var ts models.TimeSeriesData
		err := timeRows.Scan(&ts.Date, &ts.Scans)
		if err != nil {
			continue
		}
		timeSeries = append(timeSeries, ts)
	}

	// Ensure we return empty arrays instead of null
	if recentScans == nil {
		recentScans = []models.QRScan{}
	}
	if timeSeries == nil {
		timeSeries = []models.TimeSeriesData{}
	}

	analytics := models.QRAnalytics{
		QRCode:      qr,
		TotalScans:  totalScans,
		RecentScans: recentScans,
		TimeSeries:  timeSeries,
	}

	c.JSON(http.StatusOK, analytics)
}

func (h *Handler) GetTimeSeriesData(c *gin.Context) {
	days := c.DefaultQuery("days", "30")
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	query := fmt.Sprintf(`
		SELECT DATE(scanned_at) as date, COUNT(*) as scans 
		FROM qr_scans 
		LEFT JOIN qr_codes ON qr_scans.qr_code_id = qr_codes.id
		WHERE scanned_at >= DATE('now', '-%s days') AND qr_codes.user_id = ?
		GROUP BY DATE(scanned_at) 
		ORDER BY date
	`, days)

	rows, err := h.db.Query(query, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not fetch time series data"})
		return
	}
	defer rows.Close()

	var timeSeries []models.TimeSeriesData
	for rows.Next() {
		var ts models.TimeSeriesData
		err := rows.Scan(&ts.Date, &ts.Scans)
		if err != nil {
			continue
		}
		timeSeries = append(timeSeries, ts)
	}

	// Ensure we return an empty array instead of null
	if timeSeries == nil {
		timeSeries = []models.TimeSeriesData{}
	}

	c.JSON(http.StatusOK, timeSeries)
}

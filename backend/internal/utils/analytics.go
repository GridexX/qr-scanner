package utils

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"os"
	"strings"
)

type GeolocationResponse struct {
	IP       string `json:"ip"`
	Location struct {
		CountryName string `json:"country_name"`
		City        string `json:"city"`
	} `json:"location"`
}

func GetGeolocation(ip string) (string, string, error) {
	apiKey := os.Getenv("IPGEOLOCATION_API_KEY")
	if apiKey == "" {
		return "", "", nil // Return empty if no API key is configured
	}

	// Skip private IPs
	if isPrivateIP(ip) {
		return "", "", nil
	}

	url := fmt.Sprintf("https://api.ipgeolocation.io/v2/ipgeo?apiKey=%s&ip=%s", apiKey, ip)
	resp, err := http.Get(url)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	var geoResp GeolocationResponse
	if err := json.NewDecoder(resp.Body).Decode(&geoResp); err != nil {
		return "", "", err
	}

	return geoResp.Location.CountryName, geoResp.Location.City, nil
}

func isPrivateIP(ip string) bool {
	parsedIP := net.ParseIP(ip)
	if parsedIP == nil {
		return false
	}

	// Check for private IP ranges
	privateRanges := []string{
		"10.0.0.0/8",
		"172.16.0.0/12",
		"192.168.0.0/16",
		"127.0.0.0/8",
	}

	for _, cidr := range privateRanges {
		_, network, _ := net.ParseCIDR(cidr)
		if network.Contains(parsedIP) {
			return true
		}
	}

	return false
}

func ParseUserAgent(userAgent string) (browser, deviceType string) {
	ua := strings.ToLower(userAgent)

	// Browser detection
	switch {
	case strings.Contains(ua, "chrome"):
		browser = "Chrome"
	case strings.Contains(ua, "firefox"):
		browser = "Firefox"
	case strings.Contains(ua, "safari"):
		browser = "Safari"
	case strings.Contains(ua, "edge"):
		browser = "Edge"
	default:
		browser = "Unknown"
	}

	// Device type detection
	switch {
	case strings.Contains(ua, "mobile"):
		deviceType = "Mobile"
	case strings.Contains(ua, "tablet"):
		deviceType = "Tablet"
	default:
		deviceType = "Desktop"
	}

	return browser, deviceType
}

func GetClientIP(r *http.Request) string {
	// Check X-Forwarded-For header
	xForwardedFor := r.Header.Get("X-Forwarded-For")
	if xForwardedFor != "" {
		ips := strings.Split(xForwardedFor, ",")
		return strings.TrimSpace(ips[0])
	}

	// Check X-Real-IP header
	xRealIP := r.Header.Get("X-Real-IP")
	if xRealIP != "" {
		return xRealIP
	}

	// Fall back to RemoteAddr
	ip, _, _ := net.SplitHostPort(r.RemoteAddr)
	return ip
}

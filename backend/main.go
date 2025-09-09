package main

import (
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/GridexX/qr-tracker/internal/database"
	"github.com/GridexX/qr-tracker/internal/handlers"
	"github.com/GridexX/qr-tracker/internal/middleware"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {

	// Initialize database
	db, err := database.Initialize()
	if err != nil {
		log.Fatal("Failed to initialize database:", err)
	}
	defer db.Close()

	// Initialize handlers
	h := handlers.NewHandler(db)

	// Setup Gin router
	r := gin.Default()

	// Only used for debug, print out all env variables
	r.Use(gin.Logger())
	r.Use(gin.Recovery())

	log.Printf("Gin mode: %s", gin.Mode())
	if gin.Mode() == gin.DebugMode {
		log.Println("Environment Variables:")
		for _, e := range os.Environ() {
			pair := strings.SplitN(e, "=", 2)
			fmt.Printf("%s: %s\n", pair[0], pair[1])
			log.Printf("%s: %s\n", pair[0], pair[1])
		}
	}

	// CORS middleware
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{getEnv("FRONTEND_URL", "http://localhost:3000")},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	// Public routes
	r.POST("/api/auth/login", h.Login)
	r.GET("/r/:code", h.RedirectQR)                 // QR code redirect route
	r.Static("/data/qr_images", "./data/qr_images") // Serve QR code images

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Protected routes
	api := r.Group("/api")
	api.Use(middleware.AuthMiddleware())
	{
		// QR Code management
		api.POST("/qr", h.CreateQR)
		api.GET("/qr", h.ListQR)
		api.GET("/qr/:id", h.GetQR)
		api.PUT("/qr/:id", h.UpdateQR)
		api.DELETE("/qr/:id", h.DeleteQR)

		// Analytics
		api.GET("/analytics/overview", h.GetAnalyticsOverview)
		api.GET("/analytics/qr/:id", h.GetQRAnalytics)
		api.GET("/analytics/timeseries", h.GetTimeSeriesData)
	}

	port := getEnv("PORT", "8080")
	log.Printf("Server starting on port %s", port)
	r.Run(":" + port)
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

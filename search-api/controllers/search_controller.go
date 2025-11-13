package controllers

import (
	"net/http"

	"search-api/domain"
	"search-api/services"

	"github.com/gin-gonic/gin"
)

type SearchController struct {
	searchService services.SearchService
}

func NewSearchController(searchService services.SearchService) *SearchController {
	return &SearchController{
		searchService: searchService,
	}
}

func (c *SearchController) Search(ctx *gin.Context) {
	var req domain.SearchRequest
	if err := ctx.ShouldBindQuery(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := c.searchService.Search(req)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, result)
}


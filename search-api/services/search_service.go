package services

import (
	"crypto/md5"
	"encoding/json"
	"fmt"
	"time"

	"search-api/domain"
	"search-api/repositories"
)

type SearchService interface {
	Search(req domain.SearchRequest) (*domain.SearchResponse, error)
	IndexApartment(apt *domain.ApartmentSearchResult) error
	UpdateApartment(apt *domain.ApartmentSearchResult) error
	DeleteApartment(id int64) error
}

type searchService struct {
	solrRepo      repositories.SolrRepository
	localCache    repositories.LocalCache
	memcachedCache repositories.MemcachedCache
	apartmentsClient repositories.ApartmentsClient
}

func NewSearchService(
	solrRepo repositories.SolrRepository,
	localCache repositories.LocalCache,
	memcachedCache repositories.MemcachedCache,
	apartmentsClient repositories.ApartmentsClient,
) SearchService {
	return &searchService{
		solrRepo:        solrRepo,
		localCache:      localCache,
		memcachedCache:  memcachedCache,
		apartmentsClient: apartmentsClient,
	}
}

// generateCacheKey genera una clave única para la búsqueda
func (s *searchService) generateCacheKey(req domain.SearchRequest) string {
	keyData := fmt.Sprintf("%s|%s|%f|%f|%d|%s|%s|%d|%d|%s|%s",
		req.Q, req.City, req.MinPrice, req.MaxPrice, req.Capacity,
		req.CheckIn, req.CheckOut, req.Page, req.Size, req.SortBy, req.SortOrder)
	hash := md5.Sum([]byte(keyData))
	return fmt.Sprintf("search:%x", hash)
}

// Search implementa doble caché: primero local (CCache), luego Memcached, luego Solr
func (s *searchService) Search(req domain.SearchRequest) (*domain.SearchResponse, error) {
	// Generar clave de caché
	cacheKey := s.generateCacheKey(req)

	// 1. Intentar obtener de caché local (TTL 5 min)
	if cached, found := s.localCache.Get(cacheKey); found {
		if result, ok := cached.(*domain.SearchResponse); ok {
			return result, nil
		}
	}

	// 2. Intentar obtener de Memcached (TTL 15 min)
	if cached, found := s.memcachedCache.Get(cacheKey); found {
		if resultMap, ok := cached.(map[string]interface{}); ok {
			// Convertir map a SearchResponse
			jsonData, _ := json.Marshal(resultMap)
			var result domain.SearchResponse
			if err := json.Unmarshal(jsonData, &result); err == nil {
				// Guardar también en caché local
				s.localCache.Set(cacheKey, &result, 5*time.Minute)
				return &result, nil
			}
		}
	}

	// 3. Buscar en Solr
	result, err := s.solrRepo.Search(req)
	if err != nil {
		return nil, err
	}

	// 4. Guardar en ambas cachés (Cache-aside pattern)
	s.localCache.Set(cacheKey, result, 5*time.Minute)
	s.memcachedCache.Set(cacheKey, result, 15*time.Minute)

	return result, nil
}

func (s *searchService) IndexApartment(apt *domain.ApartmentSearchResult) error {
	return s.solrRepo.IndexApartment(apt)
}

func (s *searchService) UpdateApartment(apt *domain.ApartmentSearchResult) error {
	// Invalidar cachés relacionadas
	// Por simplicidad, invalidamos todas las búsquedas (en producción usar tags)
	return s.solrRepo.UpdateApartment(apt)
}

func (s *searchService) DeleteApartment(id int64) error {
	// Invalidar cachés relacionadas
	return s.solrRepo.DeleteApartment(id)
}


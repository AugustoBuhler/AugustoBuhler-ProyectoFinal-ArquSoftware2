package services

import (
	"errors"
	"time"

	"users-api/domain"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type UserService interface {
	CreateUser(req domain.CreateUserRequest) (*domain.User, error)
	Login(req domain.LoginRequest) (string, *domain.User, error)
	GetUserByID(id uint) (*domain.User, error)
}

type userService struct {
	userRepo UserRepository
	jwtSecret string
}

type UserRepository interface {
	Create(user *domain.User) error
	GetByID(id uint) (*domain.User, error)
	GetByUsername(username string) (*domain.User, error)
	GetByEmail(email string) (*domain.User, error)
}

func NewUserService(userRepo UserRepository, jwtSecret string) UserService {
	return &userService{
		userRepo:  userRepo,
		jwtSecret: jwtSecret,
	}
}

func (s *userService) CreateUser(req domain.CreateUserRequest) (*domain.User, error) {
	// Verificar si el usuario ya existe
	_, err := s.userRepo.GetByUsername(req.Username)
	if err == nil {
		return nil, errors.New("username already exists")
	}

	_, err = s.userRepo.GetByEmail(req.Email)
	if err == nil {
		return nil, errors.New("email already exists")
	}

	// Hashear password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	// Determinar user_type
	userType := req.UserType
	if userType == "" {
		userType = "normal"
	}

	// Crear usuario
	user := &domain.User{
		Username:  req.Username,
		Email:     req.Email,
		Password:  string(hashedPassword),
		FirstName: req.FirstName,
		LastName:  req.LastName,
		UserType:  userType,
	}

	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}

	// No devolver el password
	user.Password = ""
	return user, nil
}

func (s *userService) Login(req domain.LoginRequest) (string, *domain.User, error) {
	// Buscar usuario
	user, err := s.userRepo.GetByUsername(req.Username)
	if err != nil {
		return "", nil, errors.New("invalid credentials")
	}

	// Verificar password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return "", nil, errors.New("invalid credentials")
	}

	// Generar JWT
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":   user.ID,
		"user_type": user.UserType,
		"exp":       time.Now().Add(24 * time.Hour).Unix(),
	})

	tokenString, err := token.SignedString([]byte(s.jwtSecret))
	if err != nil {
		return "", nil, err
	}

	// No devolver el password
	user.Password = ""
	return tokenString, user, nil
}

func (s *userService) GetUserByID(id uint) (*domain.User, error) {
	user, err := s.userRepo.GetByID(id)
	if err != nil {
		return nil, err
	}
	// No devolver el password
	user.Password = ""
	return user, nil
}


package repositories

import (
	"users-api/domain"

	"gorm.io/gorm"
)

type User struct {
	gorm.Model
	Username  string `gorm:"uniqueIndex;not null"`
	Email     string `gorm:"uniqueIndex;not null"`
	Password  string `gorm:"not null"`
	FirstName string `gorm:"column:first_name"`
	LastName  string `gorm:"column:last_name"`
	UserType  string `gorm:"column:user_type;default:'normal'"`
}

type UserRepository interface {
	Create(user *domain.User) error
	GetByID(id uint) (*domain.User, error)
	GetByUsername(username string) (*domain.User, error)
	GetByEmail(email string) (*domain.User, error)
}

type userRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) Create(user *domain.User) error {
	userModel := &User{
		Username:  user.Username,
		Email:     user.Email,
		Password:  user.Password,
		FirstName: user.FirstName,
		LastName:  user.LastName,
		UserType:  user.UserType,
	}
	if err := r.db.Create(userModel).Error; err != nil {
		return err
	}
	user.ID = userModel.ID
	return nil
}

func (r *userRepository) GetByID(id uint) (*domain.User, error) {
	var userModel User
	if err := r.db.First(&userModel, id).Error; err != nil {
		return nil, err
	}
	return &domain.User{
		ID:        userModel.ID,
		Username:  userModel.Username,
		Email:     userModel.Email,
		Password:  userModel.Password,
		FirstName: userModel.FirstName,
		LastName:  userModel.LastName,
		UserType:  userModel.UserType,
	}, nil
}

func (r *userRepository) GetByUsername(username string) (*domain.User, error) {
	var userModel User
	if err := r.db.Where("username = ?", username).First(&userModel).Error; err != nil {
		return nil, err
	}
	return &domain.User{
		ID:        userModel.ID,
		Username:  userModel.Username,
		Email:     userModel.Email,
		Password:  userModel.Password,
		FirstName: userModel.FirstName,
		LastName:  userModel.LastName,
		UserType:  userModel.UserType,
	}, nil
}

func (r *userRepository) GetByEmail(email string) (*domain.User, error) {
	var userModel User
	if err := r.db.Where("email = ?", email).First(&userModel).Error; err != nil {
		return nil, err
	}
	return &domain.User{
		ID:        userModel.ID,
		Username:  userModel.Username,
		Email:     userModel.Email,
		Password:  userModel.Password,
		FirstName: userModel.FirstName,
		LastName:  userModel.LastName,
		UserType:  userModel.UserType,
	}, nil
}


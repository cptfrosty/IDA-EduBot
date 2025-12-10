from pydantic import BaseModel


class UserRegister(BaseModel): #JSON модель регистрации пользователя
    username: str  # Добавьте это поле
    email: str  # Лучше использовать EmailStr
    password: str
    role: str = "none"  # Значение по умолчанию
    first_name: str
    last_name: str
    phone: str = None  



class Request(BaseModel):
    status: str = "success"
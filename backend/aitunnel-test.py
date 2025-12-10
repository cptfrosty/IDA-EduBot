from openai import OpenAI

client = OpenAI(
    api_key="sk-aitunnel-j4Qef6MFSmQXHBMmcN7fckggI8eQE9ch", # Ключ из нашего сервиса
    base_url="https://api.aitunnel.ru/v1/",
)

chat_result = client.chat.completions.create(
    messages=[{"role": "user", "content": "Скажи интересный факт"}],
    model="deepseek-r1",
    max_tokens=500, # Старайтесь указывать для более точного расчёта цены
)
print(chat_result.choices[0].message)
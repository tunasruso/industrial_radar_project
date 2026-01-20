import os
import json
from datetime import datetime
from tavily import TavilyClient # Рекомендуемый инструмент для AI-исследований

# Настройка API (ключ должен быть в .env файле)
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
client = TavilyClient(api_key=TAVILY_API_KEY)

def perform_research(query, search_depth="advanced"):
    """Выполняет поиск и возвращает структурированный контент."""
    print(f"Исследование по запросу: {query}...")
    return client.search(query, search_depth=search_depth, max_results=5)

def save_manual(title, content):
    """Сохраняет найденные инструкции в папку проекта."""
    path = "data/output/technical_manuals/"
    if not os.path.exists(path):
        os.makedirs(path)
    
    filename = f"{path}{title.replace(' ', '_').lower()}.md"
    with open(filename, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Документ сохранен: {filename}")

def main():
    # 1. Исследование кремниевого покрытия (USP для Радара)
    silicon_query = (
        "CVD silicon coating stainless steel 316L chemical resistance "
        "sulfuric acid scientific papers properties"
    )
    silicon_results = perform_research(silicon_query)
    
    silicon_report = "# Отчет по кремниевому покрытию (R&D)\n\n"
    for res in silicon_results['results']:
        silicon_report += f"### {res['title']}\nURL: {res['url']}\n\n{res['content']}\n\n---\n"
    
    save_manual("silicon_coating_research", silicon_report)

    # 2. Поиск инструкций для лазерной сварки (Загрузка простоя)
    welding_query = (
        "Laser welding wire feeder FWS-01A manual instructions stainless steel 316L "
        "settings for beginners"
    )
    welding_results = perform_research(welding_query)
    
    welding_guide = "# Инструкция по лазерной сварке (FWS-01A)\n\n"
    for res in welding_results['results']:
        welding_guide += f"### Источник: {res['title']}\n{res['content']}\n\n"
    
    save_manual("welding_quick_start", welding_guide)

    print("\nИсследование завершено. Все данные в data/output/technical_manuals/")

if __name__ == "__main__":
    if not TAVILY_API_KEY:
        print("Ошибка: TAVILY_API_KEY не найден в переменных окружения.")
    else:
        main()

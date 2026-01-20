import pandas as pd
import numpy as np
import os

# Константы проекта
HOURLY_RATE = 1000
MAX_PRESSURE_LIMIT = 15.0
IDLE_BOOST_FACTOR = 1.3
MIN_SCORE_THRESHOLD = 75

def load_data():
    """Загрузка необходимых данных проекта."""
    try:
        factory = pd.read_csv('data/factory/factory_specs.csv')
        reference = pd.read_csv('data/reference/buerkle_catalogue_2024_full.csv')
        return factory, reference
    except FileNotFoundError as e:
        print(f"Ошибка: Не найден файл данных. {e}")
        return None, None

def calculate_match_score(row, factory_materials, idle_types):
    """Алгоритм технического и экономического мэтчинга."""
    score = 0
    
    # 1. Проверка материалов (MatMatch)
    # Считаем, что в каталоге материалы могут быть перечислены через запятую
    item_materials = [m.strip().upper() for m in str(row['Material']).split(',')]
    if any(m in factory_materials for m in item_materials):
        score += 40
    
    # 2. Проверка ограничений по давлению
    # Извлекаем число из строки спецификаций (упрощенно)
    try:
        if 'PN' in str(row['Specifications']):
            pn_value = float(''.join(filter(str.isdigit, str(row['Specifications']).split('PN')[1][:3])))
            if pn_value <= MAX_PRESSURE_LIMIT:
                score += 20
        else:
            score += 10 # По умолчанию для изделий без давления
    except:
        score += 10

    # 3. Приоритет для простаивающего оборудования (IdleBoost)
    # Если категория изделия соответствует лазерной резке или гравировке
    if any(t in str(row['Category']).lower() for t in ['sampling', 'labels', 'containers']):
        score *= IDLE_BOOST_FACTOR

    # 4. Экономический фильтр (EcoFit)
    # Примерная оценка сложности (эмпирический коэффициент)
    complexity = 1.5 if score > 50 else 3.0
    estimated_cost = complexity * HOURLY_RATE
    
    return round(score, 2), estimated_cost

def main():
    print("Запуск Matching Engine...")
    factory, reference = load_data()
    
    if factory is None or reference is None:
        return

    # Подготовка данных завода
    factory_materials = set()
    for mats in factory['Materials'].dropna():
        for m in mats.split(','):
            factory_materials.add(m.strip().upper())
            
    idle_types = factory[factory['Status'] == 'IDLE_PRIORITY']['Type'].tolist()

    # Запуск анализа
    results = []
    for index, row in reference.iterrows():
        score, cost = calculate_match_score(row, factory_materials, idle_types)
        
        if score >= MIN_SCORE_THRESHOLD:
            results.append({
                'Article_No': row['Article_No'],
                'Product_Name': row['Product_Name'],
                'Confidence_Score': score,
                'Estimated_Cost': cost,
                'Category': row['Category'],
                'Material': row['Material']
            })

    # Сохранение результатов
    output_df = pd.DataFrame(results).sort_values(by='Confidence_Score', ascending=False)
    
    if not os.path.exists('data/output'):
        os.makedirs('data/output')
        
    output_df.to_csv('data/output/rd_backlog.csv', index=False)
    print(f"Анализ завершен. Найдено {len(output_df)} подходящих позиций. Результаты в data/output/rd_backlog.csv")

if __name__ == "__main__":
    main()

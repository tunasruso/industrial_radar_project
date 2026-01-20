import sys

# Глобальные константы из ТЗ
HOURLY_RATE = 1000  # Стоимость часа работы оборудования, руб.
MATERIAL_MARGIN = 1.2  # Наценка на материалы (20%)

def calculate_production_cost(processing_hours, material_base_cost):
    """
    Рассчитывает полную себестоимость производства изделия.
    
    Args:
        processing_hours (float): Время обработки на станках в часах.
        material_base_cost (float): Базовая стоимость сырья (металл, заготовки).
        
    Returns:
        float: Итоговая себестоимость.
    """
    work_cost = processing_hours * HOURLY_RATE
    material_cost = material_base_cost * MATERIAL_MARGIN
    
    total_cost = work_cost + material_cost
    return round(total_cost, 2)

def estimate_profitability(market_price, calculated_cost):
    """
    Оценивает потенциальную прибыль и маржинальность.
    """
    if market_price <= 0:
        return 0, 0
    
    profit = market_price - calculated_cost
    margin = (profit / market_price) * 100
    return round(profit, 2), round(margin, 2)

def main():
    """
    CLI интерфейс для быстрой проверки агентом или пользователем.
    Использование: python cost_calc.py [часы] [стоимость_материала]
    """
    if len(sys.argv) < 3:
        print("Использование: python cost_calc.py <часы> <стоимость_материала>")
        return

    try:
        hours = float(sys.argv[1])
        mat_cost = float(sys.argv[2])
        
        cost = calculate_production_cost(hours, mat_cost)
        print(f"--- Расчет себестоимости ---")
        print(f"Время работы: {hours} ч. (по {HOURLY_RATE} руб/ч)")
        print(f"Материалы (+20%): {mat_cost * MATERIAL_MARGIN} руб.")
        print(f"ИТОГО СЕБЕСТОИМОСТЬ: {cost} руб.")
        
    except ValueError:
        print("Ошибка: Параметры должны быть числами.")

if __name__ == "__main__":
    main()

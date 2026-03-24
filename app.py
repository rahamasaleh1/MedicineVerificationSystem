import csv

def load_medicines(filename):
    medicines = []
    with open(filename, mode='r') as file:
        reader = csv.DictReader(file)
        for row in reader:
            medicines.append(row)
    return medicines

def find_medicine_by_id(medicines, medicine_id):
    for medicine in medicines:
        if medicine["medicine_id"].lower() == medicine_id.lower():
            return medicine
    return None

def log_scan_result(filename, medicine):
    with open(filename, mode='a') as file:
        file.write(
            f'{medicine["medicine_id"]},{medicine["medicine_name"]},{medicine["is_counterfeit"]}\n'
        )

def main():
    medicines = load_medicines("medicines.csv")
    medicine_id = input("Enter medicine ID: ")

    result = find_medicine_by_id(medicines, medicine_id)

    if result:
        print("\nMedicine found")
        print(f'Name: {result["medicine_name"]}')
        print(f'Manufacturer: {result["manufacturer"]}')
        print(f'Expiry Date: {result["expiry_date"]}')
        print(f'Counterfeit: {result["is_counterfeit"]}')

        log_scan_result("scan_history.txt", result)
        print("\nScan logged successfully.")
    else:
        print("\nMedicine not found.")

if __name__ == "__main__":
    main()

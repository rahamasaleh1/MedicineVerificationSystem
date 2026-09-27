"""
Command line version of the medicine checker.

Looks up a medicine ID in medicines.csv, reports whether it is genuine,
counterfeit, expired or not recognised, and logs every check with a timestamp.

Usage: python verify.py
"""

import csv
import os
from datetime import date, datetime

# Look for files next to this script, wherever it is run from
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MEDICINES_FILE = os.path.join(BASE_DIR, "medicines.csv")
HISTORY_FILE = os.path.join(BASE_DIR, "scan_history.csv")


def load_medicines(filename):
    """Return the register as a dict keyed by upper case medicine ID."""
    with open(filename, newline="", encoding="utf-8") as file:
        return {row["medicine_id"].strip().upper(): row for row in csv.DictReader(file)}


def get_status(medicine):
    if medicine is None:
        return "NOT RECOGNISED"
    if medicine["is_counterfeit"].strip().lower() == "yes":
        return "COUNTERFEIT"
    if date.fromisoformat(medicine["expiry_date"]) < date.today():
        return "EXPIRED"
    return "GENUINE"


def log_scan(filename, medicine_id, medicine, status):
    new_file = not os.path.exists(filename)
    with open(filename, "a", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        if new_file:
            writer.writerow(["timestamp", "medicine_id", "medicine_name", "result"])
        name = medicine["medicine_name"] if medicine else ""
        writer.writerow([datetime.now().isoformat(timespec="seconds"), medicine_id, name, status])


def print_result(medicine_id, medicine, status):
    advice = {
        "GENUINE": "On the register and in date.",
        "COUNTERFEIT": "Do not dispense. Quarantine the stock and report it.",
        "EXPIRED": "Past its expiry date. Do not dispense.",
        "NOT RECOGNISED": "Not on the register. Treat as suspicious until verified.",
    }
    print(f"\n{status}: {advice[status]}")
    if medicine:
        print(f"  Name:         {medicine['medicine_name']}")
        print(f"  Manufacturer: {medicine['manufacturer']}")
        print(f"  Expiry date:  {medicine['expiry_date']}")
    else:
        print(f"  ID entered:   {medicine_id}")


def main():
    try:
        medicines = load_medicines(MEDICINES_FILE)
    except FileNotFoundError:
        print(f"Could not find {MEDICINES_FILE}.")
        return

    print(f"Loaded {len(medicines)} medicines. Type q to quit.")

    while True:
        medicine_id = input("\nEnter medicine ID: ").strip().upper()
        if medicine_id in ("Q", "QUIT", "EXIT"):
            break
        if not medicine_id:
            continue

        medicine = medicines.get(medicine_id)
        status = get_status(medicine)
        print_result(medicine_id, medicine, status)
        log_scan(HISTORY_FILE, medicine_id, medicine, status)


if __name__ == "__main__":
    main()

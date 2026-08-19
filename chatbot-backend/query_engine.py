from pathlib import Path
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent
CACHE_PATH = BASE_DIR / "data_cache.parquet"

DEVICE_ALIASES = {
    "cafe": ["cafe", "coffee", "machine a cafe", "machine_cafe"],
    "fridge": ["fridge", "frigo", "refrigerateur"],
    "laptop": ["laptop", "ordinateur", "pc"],
    "totale": ["totale", "total", "global", "maison"],
    "tv": ["tv", "television"],
}
MONTHS = {3: ("march", "mars"), 4: ("april", "avril"), 5: ("may", "mai"), 6: ("june", "juin"), 7: ("july", "juillet")}
_df_cache = None


def get_data():
    global _df_cache
    if _df_cache is None:
        if not CACHE_PATH.exists():
            raise FileNotFoundError("Historical cache missing. Run build_history_cache.py.")
        _df_cache = pd.read_parquet(CACHE_PATH)
        _df_cache["datetime"] = pd.to_datetime(_df_cache["datetime"])
    return _df_cache


def detect_device(question):
    question_lower = question.lower()
    for device, aliases in DEVICE_ALIASES.items():
        if any(alias in question_lower for alias in aliases):
            return device
    return None


def filter_period(df, question):
    question_lower = question.lower()
    for month_number, names in MONTHS.items():
        if any(name in question_lower for name in names):
            return df[df["datetime"].dt.month == month_number], f" pour {names[-1]}"
    return df, ""


def build_context(question):
    df, period_label = filter_period(get_data(), question)
    device = detect_device(question)
    d = df[df["device"] == device] if device else df
    scope = f"l'appareil '{device}'" if device else "tous les appareils"
    if d.empty:
        return "Aucune donnee historique trouvee pour cette question."

    interval_seconds = d["datetime"].sort_values().diff().dt.total_seconds().median()
    interval_seconds = interval_seconds if pd.notna(interval_seconds) and interval_seconds > 0 else 5
    energy_wh = d["P"].sum() * interval_seconds / 3600
    return "\n".join([
        f"Statistiques historiques pour {scope}{period_label}:",
        f"- Periode disponible: du {d['datetime'].min()} au {d['datetime'].max()}",
        f"- Nombre de mesures: {len(d)}",
        f"- Voltage moyen: {d['V'].mean():.2f} V",
        f"- Courant moyen: {d['I'].mean():.4f} A",
        f"- Puissance moyenne: {d['P'].mean():.2f} W",
        f"- Puissance maximale: {d['P'].max():.2f} W",
        f"- Puissance minimale: {d['P'].min():.2f} W",
        f"- Facteur de puissance moyen: {d['PF'].mean():.3f}",
        f"- Energie estimee: {energy_wh / 1000:.3f} kWh",
    ])

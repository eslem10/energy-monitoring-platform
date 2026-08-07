import pandas as pd
import os

DEVICE_ALIASES = {
    'cafe': ['cafe', 'café', 'coffee', 'machine a cafe'],
    'fridge': ['fridge', 'frigo', 'refrigerateur', 'réfrigérateur'],
    'laptop': ['laptop', 'ordinateur', 'pc'],
    'totale': ['totale', 'total', 'global'],
    'tv': ['tv', 'television', 'télé'],
}

_df_cache = None

def get_data():
    global _df_cache
    if _df_cache is None:
        _df_cache = pd.read_parquet("data_cache.parquet")
    return _df_cache


def detect_device(question):
    question_lower = question.lower()
    for device, aliases in DEVICE_ALIASES.items():
        for alias in aliases:
            if alias in question_lower:
                return device
    return None


def build_context(question):
    df = get_data()
    device = detect_device(question)

    if device:
        d = df[df['device'] == device]
        context = f"Statistiques pour l'appareil '{device}':\n"
    else:
        d = df
        context = "Statistiques globales (tous appareils confondus):\n"

    if d.empty:
        return "Aucune donnee trouvee pour cette question."

    context += f"- Periode disponible: du {d['datetime'].min()} au {d['datetime'].max()}\n"
    context += f"- Nombre de mesures: {len(d)}\n"
    context += f"- Voltage moyen: {d['V'].mean():.2f} V\n"
    context += f"- Courant moyen: {d['I'].mean():.4f} A\n"
    context += f"- Puissance moyenne: {d['P'].mean():.2f} W\n"
    context += f"- Puissance max: {d['P'].max():.2f} W\n"
    context += f"- Puissance min: {d['P'].min():.2f} W\n"
    context += f"- Facteur de puissance moyen: {d['PF'].mean():.3f}\n"

    energy_wh = d['P'].sum() * (5/3600)
    context += f"- Energie consommee estimee: {energy_wh/1000:.3f} kWh\n"

    return context
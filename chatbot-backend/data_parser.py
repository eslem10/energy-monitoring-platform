import re
import glob
import os
import pandas as pd

def parse_log_file(filepath, device_name=None):
    pattern = re.compile(
        r'\[(?P<device>\w+)\]\s*'
        r'\[(?P<datetime>[\d/]+\s+[\d:]+)\]\s*\|\s*'
        r'V:\s*([\d.]+)\s*V\s*\|\s*'
        r'I:\s*([\d.]+)\s*A\s*\|\s*'
        r'F:\s*([\d.]+)\s*Hz\s*\|\s*'
        r'TH:([\d.]+)\s*V\s*\|\s*'
        r'PF:\s*([\d.]+)\s*\|\s*'
        r'P:\s*([\d.]+)\s*W\s*\|\s*'
        r'Q:\s*([\d.]+)\s*VAR\s*\|\s*'
        r'S:\s*([\d.]+)\s*VA'
    )

    rows = []
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            match = pattern.search(line)
            if match:
                rows.append({
                    'device': device_name or match.group('device'),
                    'datetime': match.group('datetime'),
                    'V': float(match.group(3)),
                    'I': float(match.group(4)),
                    'F': float(match.group(5)),
                    'TH': float(match.group(6)),
                    'PF': float(match.group(7)),
                    'P': float(match.group(8)),
                    'Q': float(match.group(9)),
                    'S': float(match.group(10)),
                })

    df = pd.DataFrame(rows)
    if not df.empty:
        df['datetime'] = pd.to_datetime(df['datetime'], format='%d/%m/%Y %H:%M:%S')
    return df


def load_all_devices(base_path):
    all_dfs = []
    device_folders = glob.glob(os.path.join(base_path, '*_data'))

    print(f"Devices trouves: {len(device_folders)}")

    for folder in device_folders:
        folder_name = os.path.basename(folder)
        device_name = folder_name.replace('mcp_', '').replace('_data', '')

        txt_files = glob.glob(os.path.join(folder, '*.txt'))
        print(f"  {device_name}: {len(txt_files)} fichier(s)")

        for filepath in txt_files:
            df = parse_log_file(filepath, device_name=device_name)
            if not df.empty:
                all_dfs.append(df)

    if all_dfs:
        combined = pd.concat(all_dfs, ignore_index=True)
        combined = combined.sort_values('datetime').reset_index(drop=True)
        return combined
    else:
        return pd.DataFrame()


def get_summary(df, device_filter=None):
    if device_filter:
        df = df[df['device'].str.lower() == device_filter.lower()]

    if df.empty:
        return "Aucune donnee disponible pour ce filtre."

    devices = df['device'].unique()
    summary = f"Data disponible: {len(df)} mesures, appareils: {', '.join(devices)}\n"
    summary += f"Periode: du {df['datetime'].min()} au {df['datetime'].max()}\n\n"

    for device in devices:
        d = df[df['device'] == device]
        summary += f"--- {device} ---\n"
        summary += f"Nombre de mesures: {len(d)}\n"
        summary += f"Voltage moyen: {d['V'].mean():.2f} V (min: {d['V'].min():.2f}, max: {d['V'].max():.2f})\n"
        summary += f"Courant moyen: {d['I'].mean():.4f} A (min: {d['I'].min():.4f}, max: {d['I'].max():.4f})\n"
        summary += f"Puissance moyenne: {d['P'].mean():.2f} W (min: {d['P'].min():.2f}, max: {d['P'].max():.2f})\n"
        summary += f"Puissance totale cumulee (approx): {d['P'].sum():.2f} W\n\n"

    return summary
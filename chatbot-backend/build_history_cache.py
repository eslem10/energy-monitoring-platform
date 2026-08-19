"""Build the chatbot history cache from the MCP text logs in the repository."""
from pathlib import Path
import sys

BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BACKEND_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))
from data_parser import load_all_devices  # noqa: E402


def main():
    dataframe = load_all_devices(PROJECT_DIR)
    if dataframe.empty:
        raise SystemExit("No MCP historical text files were found.")
    destination = BACKEND_DIR / "data_cache.parquet"
    dataframe.to_parquet(destination, index=False)
    print(f"Saved {len(dataframe)} measurements to {destination}")


if __name__ == "__main__":
    main()

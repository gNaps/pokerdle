"""Rebuild the bundled Gen I–VIII catalog from the official PokeAPI CSVs.

Run: yarn catalog:generate. No network is used during gameplay or builds.
"""
import csv
import io
import json
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/"
FILES = ["pokemon_species", "pokemon", "pokemon_types", "types", "pokemon_species_names", "languages"]

def download(name):
    with urllib.request.urlopen(BASE + name + ".csv", timeout=60) as response:
        return name, list(csv.DictReader(io.StringIO(response.read().decode("utf-8"))))

def main():
    tables = dict(ThreadPoolExecutor(max_workers=4).map(download, FILES))
    species = {int(row["id"]): row for row in tables["pokemon_species"]}
    languages = {row["identifier"]: row["id"] for row in tables["languages"]}
    names = {(int(row["pokemon_species_id"]), row["local_language_id"]): row["name"] for row in tables["pokemon_species_names"]}
    types = {row["id"]: row["identifier"] for row in tables["types"]}
    pokemon_types = {}
    for row in tables["pokemon_types"]:
        pokemon_types.setdefault(int(row["pokemon_id"]), {})[int(row["slot"])] = types[row["type_id"]]
    defaults = {int(row["species_id"]): int(row["id"]) for row in tables["pokemon"] if row["is_default"] == "1"}
    def stage(identifier, seen=None):
        seen = set() if seen is None else seen
        if identifier in seen:
            raise ValueError("Cyclic evolution")
        seen.add(identifier)
        parent = species[identifier]["evolves_from_species_id"]
        return 1 + stage(int(parent), seen) if parent else 1
    catalog = []
    for identifier in range(1, 899):
        row = species[identifier]
        pokemon_id = defaults[identifier]
        localized = {lang: names.get((identifier, languages[lang]), row["identifier"].capitalize()) for lang in ["it", "en"]}
        catalog.append({"id": identifier, "slug": row["identifier"], "names": localized,
                        "generation": int(row["generation_id"]),
                        "types": [v for _, v in sorted(pokemon_types[pokemon_id].items())],
                        "stage": stage(identifier), "spriteId": pokemon_id})
    target = ROOT / "data" / "catalog.json"
    target.parent.mkdir(exist_ok=True)
    target.write_text(json.dumps(catalog, ensure_ascii=False, separators=(",", ":")) + "\n")
    asset_dir = ROOT / "public" / "pokemon"
    asset_dir.mkdir(exist_ok=True)
    for identifier in [1, 4, 7, 25, 133]:
        url = f"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{identifier}.png"
        with urllib.request.urlopen(url, timeout=60) as response:
            (asset_dir / f"{identifier}.png").write_bytes(response.read())
    print(f"Generated {len(catalog)} Pokémon and 5 local illustrations.")

if __name__ == "__main__":
    main()

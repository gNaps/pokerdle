import axios from "axios";
import { RiEmotionUnhappyLine } from "react-icons/ri";
import {
  PokemonChoosen,
  PokemonResult,
  PokemonToGuess,
  Result,
} from "../models/models";
import { pokemons } from "./pokemons";

export const randomIntFromInterval = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

export const getPixelImage = (name: string) => {
  const index = getNumberPokedex(name);
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${index}.png`;
};

export const getHomeImage = (name: string) => {
  const index = getNumberPokedex(name);
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${index}.png`;
};

export const getNumberPokedex = (name: string) => {
  const index = pokemons.findIndex(
    (p) => p.toLocaleLowerCase() === name.toLocaleLowerCase()
  );
  return index + 1;
};

export const getGenerationById = (id: number) => {
  return id < 152
    ? 1
    : id < 252
    ? 2
    : id < 387
    ? 3
    : id < 494
    ? 4
    : id < 650
    ? 5
    : id < 722
    ? 6
    : id < 810
    ? 7
    : 8;
};

export const getResult = (
  pokemonChoosen: PokemonChoosen,
  pokemonToGuess: PokemonToGuess
) => {
  const result: Result = {
    isCorrect: pokemonChoosen.id === pokemonToGuess.id,
    generation: pokemonChoosen.generation === pokemonToGuess.generation,
    firstType: pokemonChoosen.firstType === pokemonToGuess.firstType,
    secondType: pokemonChoosen.secondType === pokemonToGuess.secondType,
    firstLetter:
      pokemonChoosen.name.substring(0, 1) ===
      pokemonToGuess.name.substring(0, 1),
    evoChain: pokemonToGuess.evoChain === pokemonChoosen.evoChain,
  };

  return result;
};

export const getTextResult = (result: PokemonResult[]) => {
  let resultText = "";
  result.forEach((r) => {
    resultText += r.result.generation ? "🟩" : "🟥";
    resultText += r.result.firstType ? "🟩" : "🟥";
    resultText += r.result.secondType ? "🟩" : "🟥";
    resultText += r.result.evoChain ? "🟩" : "🟥";
    resultText += r.result.firstLetter ? "🟩" : "🟥";
    resultText += "\n";
  });

  return resultText;
};

export const firstLetterCapitalize = (name: string) => {
  return name.substring(0, 1).toUpperCase() + name.substring(1, name.length);
};

export const getDataPokemonByName = async (p: string) => {
  const index = getNumberPokedex(p);

  if (index > 0) {
    const pokemon_res = await axios.get(
      "https://pokeapi.co/api/v2/pokemon/" + index
    );
    const { id, name, types } = pokemon_res.data;
    const typesFlat = types.map((t: any) => t.type.name);
    const species_res = await axios.get(
      "https://pokeapi.co/api/v2/pokemon-species/" + id
    );
    const { evolution_chain } = species_res.data;
    const evolution_chain_res = await axios.get(evolution_chain.url);
    const evolution_chain_data = evolution_chain_res.data;
    let evo: any[] = [evolution_chain_data.chain.species.name];
    if (
      evolution_chain_data.chain.evolves_to &&
      evolution_chain_data.chain.evolves_to.length > 0
    ) {
      evo = [...evo, evolution_chain_data.chain.evolves_to[0].species.name];
      if (
        evolution_chain_data.chain.evolves_to[0].evolves_to &&
        evolution_chain_data.chain.evolves_to[0].evolves_to.length > 0
      ) {
        evo = [
          ...evo,
          evolution_chain_data.chain.evolves_to[0].evolves_to[0].species.name,
        ];
      }
    }

    const pokemonChoosen: PokemonChoosen = {
      id: id,
      name: name,
      firstType: typesFlat[0],
      secondType: typesFlat.length > 1 ? typesFlat[1] : "",
      generation: getGenerationById(id),
      evoChain: evo.findIndex((e) => e === name) + 1,
    };

    return pokemonChoosen;
  } else {
    return undefined;
  }
};

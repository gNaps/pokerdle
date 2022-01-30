import { RiEmotionUnhappyLine } from "react-icons/ri";
import { PokemonChoosen, PokemonToGuess, Result } from "../models/models";
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

  console.log("Result", result);
  return result;
};

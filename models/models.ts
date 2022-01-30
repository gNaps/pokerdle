export interface HomeProps {
  pokemon: PokemonToGuess;
}

export interface PokemonToGuess {
  id: number;
  name: string;
  firstType: string;
  secondType: string;
  generation: number;
  evoChain: number;
}

export interface PokemonChoosen {
  id: number;
  name: string;
  generation: number;
  firstType: string;
  secondType: string;
  evoChain: number;
}

export interface Result {
  isCorrect: boolean;
  generation: boolean;
  firstType: boolean;
  secondType: boolean;
  firstLetter: boolean;
  evoChain: boolean;
}

export interface PokemonResult {
  pokemon: PokemonChoosen;
  result: Result;
}

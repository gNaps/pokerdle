import { PokemonChoosen, Result } from "../../models/models";
import { firstLetterCapitalize, getHomeImage } from "../../utils/utils";
import Image from "next/image";

interface ChoiceProps {
  pokemon: PokemonChoosen;
  attempts: number;
  result: Result;
}

const Choice = ({ pokemon, attempts, result }: ChoiceProps) => {
  return (
    <>
      <div
        className="rounded-lg shadow-2xl px-3 py-2 flex items-center justify-between mb-4 backdrop-blur"
      >
        <div className="flex flex-col">
          <h3 className="text-xl">{firstLetterCapitalize(pokemon.name)}</h3>
          <div className="flex items-center">
            <Image
              src={getHomeImage(pokemon.name)}
              alt={pokemon.name}
              width={80}
              height={80}
            />
            <ul className="text-sm ml-3">
              <li className="flex justify-between w-48">
                <p>
                  <span className="font-medium">Generation: </span>
                  {pokemon.generation}
                </p>
                {result.generation && <p>🟩</p>}
                {!result.generation && <p>🟥</p>}
              </li>
              <li className="flex justify-between">
                <p>
                  <span className="font-medium">First type: </span>
                  {firstLetterCapitalize(pokemon.firstType)}
                </p>
                {result.firstType && <p>🟩</p>}
                {!result.firstType && <p>🟥</p>}
              </li>
              <li className="flex justify-between">
                <p>
                  <span className="font-medium">Second type: </span>
                  {pokemon.secondType ? pokemon.secondType : "//"}
                </p>
                {result.secondType && <p>🟩</p>}
                {!result.secondType && <p>🟥</p>}
              </li>
              <li className="flex justify-between">
                <p>
                  <span className="font-medium">Evo Chain: </span>
                  {pokemon.evoChain}
                </p>
                {result.evoChain && <p>🟩</p>}
                {!result.evoChain && <p>🟥</p>}
              </li>
              <li className="flex justify-between">
                <p>
                  <span className="font-medium">First letter: </span>
                  {pokemon.name.substring(0, 1).toUpperCase()}
                </p>
                {result.firstLetter && <p>🟩</p>}
                {!result.firstLetter && <p>🟥</p>}
              </li>
            </ul>
          </div>
        </div>
        <div className="text-3xl">
          {!result.isCorrect && <p>❌</p>}
          {result.isCorrect && <p>✅</p>}
        </div>
      </div>
    </>
  );
};

export default Choice;

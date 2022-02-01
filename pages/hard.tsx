import axios from "axios";
import { useEffect, useState } from "react";
import { RiSendPlaneFill, RiShareFill } from "react-icons/ri";
import Choice from "../components/choice/Choice";
import Layout from "../components/layout/Layout";
import Lifes from "../components/lifes/Lifes";
import ListFilter from "../components/listFilter/listFilter";
import { PokemonResult, PokemonToGuess, Result } from "../models/models";
import { pokemons } from "../utils/pokemons";
import {
  getDataPokemonByName,
  getGenerationById,
  getResult,
  getTextResult,
  randomIntFromInterval,
} from "../utils/utils";

let pokemon: PokemonToGuess;

const getPokemonToGuess = async () => {
  const randomNumber = randomIntFromInterval(1, 898);
  const pokemon_res = await axios.get(
    "https://pokeapi.co/api/v2/pokemon/" + randomNumber
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

  pokemon = {
    id,
    name,
    firstType: typesFlat[0],
    secondType: typesFlat.length > 1 ? typesFlat[1] : "",
    generation: getGenerationById(id),
    evoChain: evo.findIndex((e) => e === name) + 1,
  };
};

const Hard = () => {
  const [filter, setFilter] = useState<string>("");
  const [listFilterPokemon, setListFilterPokemon] =
    useState<string[]>(pokemons);
  const [showFilterPokemon, setShowFilterPokemon] = useState<boolean>(false);
  const [pokemonsResult, setPokemonResult] = useState<PokemonResult[]>([]);
  const [win, setWin] = useState<boolean>(false);
  const [attempts, setAttempts] = useState<number>(0);

  useEffect(() => {
    async function fetchPokemon() {
      await getPokemonToGuess();
      console.log(pokemon);
    }
    if (!pokemon) {
      fetchPokemon();
    }
  }, []);

  const filterPokemon = (pokeFilter: string) => {
    setFilter(pokeFilter);
    if (pokeFilter.length >= 2) {
      setShowFilterPokemon(true);
      const copyFilterPokemon = [...pokemons];
      const newFilterPokemon = copyFilterPokemon.filter((p) =>
        p.toLowerCase().startsWith(pokeFilter.toLowerCase())
      );
      setListFilterPokemon(newFilterPokemon);
    } else {
      setShowFilterPokemon(false);
    }
  };

  const selectPokemon = async (p: string) => {
    const pokemonChoosen = await getDataPokemonByName(p);

    if (pokemonChoosen) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setShowFilterPokemon(false);
      setFilter("");
      const result: Result = getResult(pokemonChoosen, pokemon);
      const newPokemonResult = [
        ...pokemonsResult,
        { pokemon: pokemonChoosen, result: result },
      ];
      setPokemonResult(newPokemonResult);

      if (attempts < 6) {
        setWin(result.isCorrect);
      } else {
        setWin(false);
      }
    } else {
      alert("pokemon non esiste");
    }
  };

  const shareResult = () => {
    const text = getTextResult(pokemonsResult);
    if (navigator.share) {
      navigator
        .share({
          title: "Pokerdle",
          url: "https://pokerdle.vercel.app/",
          text: text,
        })
        .then(() => {})
        .catch(console.error);
    } else {
      console.log("non disponibile", text);
      alert("Condivisione solo su mobile");
    }
  };

  return (
    <Layout>
      <div className="h-screen bg-hard px-2 py-3">
        <h1 className="text-5xl font-bold">Pokerdle</h1>
        <h4 className="text-xl font-bold">Guess the pokemon</h4>
        <Lifes attempts={attempts} />
        <div className="pb-20">
          {pokemonsResult.map(({ pokemon, result }, index) => (
            <Choice
              key={`${pokemon.id}_${index}`}
              pokemon={pokemon}
              result={result}
              attempts={attempts}
            />
          ))}
        </div>

        {showFilterPokemon && (
          <>
            <ListFilter
              listFilterPokemon={listFilterPokemon}
              selectPokemon={selectPokemon}
            />
          </>
        )}
        <div className="fixed bottom-0 shadow-2xl px-3 py-2 w-96 flex bg-white items-center justify-between">
          {!win && attempts < 6 && (
            <>
              <input
                type="text"
                className="border border-gray-200 bg-gray-50 rounded-md px-3 py-2 w-full"
                onChange={(e) => filterPokemon(e.currentTarget.value)}
                value={filter}
              />
              <button
                className="bg-violet-500 px-3 py-3 rounded-md 
            hover:bg-violet-700 active:bg-violet-700 text-slate-50 ml-2"
                onClick={() => selectPokemon(filter)}
              >
                <RiSendPlaneFill />
              </button>
            </>
          )}
          {win && attempts < 6 && (
            <>
              <p>You won!</p>
              {/* <button
                className="bg-violet-500 px-3 py-3 rounded-md 
            hover:bg-violet-700 active:bg-violet-700 text-slate-50 ml-2"
                onClick={() => window.location.reload()}
              >
                Play again
              </button> */}
              <button
                className="bg-violet-500 px-3 py-3 rounded-md 
            hover:bg-violet-700 active:bg-violet-700 text-slate-50 ml-2"
                onClick={() => shareResult()}
              >
                <RiShareFill />
              </button>
            </>
          )}
          {!win && attempts >= 6 && (
            <>
              <div>
                <p>You lose!</p> <p>Pokemon was {pokemon.name}! </p>
              </div>
              <button
                className="bg-violet-500 px-3 py-3 rounded-md 
            hover:bg-violet-700 active:bg-violet-700 text-slate-50 ml-2"
                onClick={() => window.location.reload()}
              >
                Play again
              </button>
              <button
                className="bg-violet-500 px-3 py-3 rounded-md 
            hover:bg-violet-700 active:bg-violet-700 text-slate-50 ml-2"
                onClick={() => shareResult()}
              >
                <RiShareFill />
              </button>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Hard;

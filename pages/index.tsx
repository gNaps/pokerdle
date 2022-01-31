import axios from "axios";
import type { GetStaticProps, NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import { useState } from "react";
import Layout from "../components/layout/Layout";
import styles from "../styles/Home.module.css";
import { RiSendPlaneFill, RiShareFill } from "react-icons/ri";
import { pokemons } from "../utils/pokemons";
import {
  getGenerationById,
  getHomeImage,
  getNumberPokedex,
  getPixelImage,
  getResult,
  randomIntFromInterval,
} from "../utils/utils";
import {
  HomeProps,
  PokemonChoosen,
  PokemonResult,
  Result,
} from "../models/models";

export const getStaticProps: GetStaticProps = async (context) => {
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

  return {
    props: {
      pokemon: {
        id,
        name,
        firstType: typesFlat[0],
        secondType: typesFlat.length > 1 ? typesFlat[1] : "",
        generation: getGenerationById(id),
        evoChain: evo.findIndex((e) => e === name) + 1,
      },
    },
    revalidate: 86400,
  };
};

const Home: NextPage<HomeProps> = ({ pokemon }) => {
  const [inGame, setInGame] = useState<boolean>(false);
  const [filter, setFilter] = useState<string>("");
  const [listFilterPokemon, setListFilterPokemon] =
    useState<string[]>(pokemons);
  const [showFilterPokemon, setShowFilterPokemon] = useState<boolean>(false);
  const [pokemonsResult, setPokemonResult] = useState<PokemonResult[]>([]);
  const [win, setWin] = useState<boolean>(false);
  const [attempts, setAttempts] = useState<number>(0);

  console.log(pokemon);

  const filterPokemon = (filter: string) => {
    setFilter(filter);
    if (filter.length >= 2) {
      setShowFilterPokemon(true);
      const copyFilterPokemon = [...pokemons];
      const newFilterPokemon = copyFilterPokemon.filter((p) =>
        p.toLowerCase().startsWith(filter)
      );
      setListFilterPokemon(newFilterPokemon);
    } else {
      setShowFilterPokemon(false);
    }

    console.log("mostra filtro??", showFilterPokemon);
    console.log("filtro attivo", listFilterPokemon);
    console.log("pokemons list", pokemons);
  };

  const selectPokemon = async (p: string) => {
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    setShowFilterPokemon(false);
    setFilter("");
    const index = getNumberPokedex(p);
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
  };

  const shareResult = () => {
    if (navigator.share) {
      navigator
        .share({
          title: "WebShare API Demo",
          url: "https://codepen.io/ayoisaiah/pen/YbNazJ",
        })
        .then(() => {
          console.log("Thanks for sharing!");
        })
        .catch(console.error);
    } else {
      console.log("non funge");
    }
  };

  return (
    <Layout>
      <h1 className="text-3xl font-bold">Pokerdle</h1>
      <p>Guess the pokemon</p>
      {!inGame && (
        <>
          <p>👋</p>
          <p>
            Hey there! This is a funny game about pokemon. Every day try to
            guess the pokemon. New game starts alwasy @ 00.00 +1GTM
          </p>
          <p>⬇</p>
          <p>
            After each try you’ll recieve hints about the misterious pokemon.
            You will see green square if it is the same of the pokemon,
            otherwise a red square:
          </p>
          <ul className="mb-10">
            <li>✨ Generation</li>
            <li>✨ First type</li>
            <li>✨ Second type</li>
            <li>✨ Evo chain</li>
            <li>✨ First letter</li>
          </ul>
          <button
            className="bg-violet-500 px-12 py-3 rounded-md 
            hover:bg-violet-700 active:bg-violet-700 text-slate-50"
            onClick={() => setInGame(true)}
          >
            Try now
          </button>
        </>
      )}
      {inGame && (
        <>
          <div className="pb-20">
            {pokemonsResult.map(({ pokemon, result }) => (
              <div
                className="rounded-lg shadow-2xl px-3 py-2 flex items-center justify-between mb-4"
                key={pokemon.id + attempts}
              >
                <div className="flex flex-col">
                  <h3 className="text-xl">{pokemon.name}</h3>
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
                          {pokemon.firstType}
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
                          {pokemon.name.substring(0, 1)}
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
            ))}
          </div>

          {showFilterPokemon && (
            <>
              <ul
                className="fixed bottom-[58px] shadow-2xl px-3 py-2 
              w-96 flex flex-col rounded-lg max-h-48 overflow-y-auto bg-white"
              >
                {listFilterPokemon.map((p, index) => (
                  <li
                    key={index}
                    role="button"
                    className="flex justify-between items-center border-b 
                    last:border-b-0 px-2 pt-2 pokemon-list-element"
                    onClick={() => selectPokemon(p.toLocaleLowerCase())}
                  >
                    <p>{p}</p>
                    <Image
                      src={getPixelImage(p)}
                      alt={p}
                      width={48}
                      height={48}
                    />
                  </li>
                ))}
              </ul>
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
                <p>You loose! Pokemon was {pokemon.name}! </p>
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
        </>
      )}
    </Layout>
  );
};

export default Home;

import type { NextPage } from "next";
import Image from "next/image";
import Link from "next/link";
import Layout from "../components/layout/Layout";

const Home: NextPage = () => {
  return (
    <Layout>
      <div className="h-screen bg-home px-2 py-3">
        <h1 className="text-5xl font-bold text-white">Pokerdle</h1>
        <h4 className="text-xl font-bold text-white">Guess the pokemon</h4>

        <div className="mt-8">
          <p className="flex items-end text-2xl">
            👋
            <Image src="/goodra.png" alt="goodra" width={48} height={48} />
          </p>
          <p>Hey there! This is a funny game about pokemon. </p>
          <p>In classic mode every day you have to try to guess the pokemon.</p>
          <p>Hard mode allows you to play as many games as you want!</p>
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
        </div>

        <div className="flex flex-col">
          <Link href={"/classic"}>
            <a className="self-center mb-3">
              <button
                className="button bg-violet-500 px-12 py-3 rounded-md 
            hover:bg-violet-700 active:bg-violet-700 text-slate-50"
              >
                Classic
              </button>
            </a>
          </Link>
          <Link href={"/hard"}>
            <a className="self-center mb-3">
              <button
                className="button bg-yellow-500 px-12 py-3 rounded-md 
            hover:bg-yellow-700 active:bg-yellow-700 text-slate-50"
              >
                Hard
              </button>
            </a>
          </Link>

          <p className="self-center my-3">
            Made with ❤️ by 
            <Link href="https://gabrielenapoli.vercel.app">
              <a className="ml-1" target={'_blank'}>Napsryu</a>
            </Link>
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Home;

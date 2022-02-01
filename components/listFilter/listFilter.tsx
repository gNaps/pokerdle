import Image from "next/image";
import { getPixelImage } from "../../utils/utils";

interface ListFilterProps {
  listFilterPokemon: string[];
  selectPokemon: (p: string) => void;
}

const ListFilter = ({ listFilterPokemon, selectPokemon }: ListFilterProps) => {
  return (
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
            <Image src={getPixelImage(p)} alt={p} width={48} height={48} />
          </li>
        ))}
      </ul>
    </>
  );
};

export default ListFilter;

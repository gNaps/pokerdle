import Image from "next/image";

interface LifesProps {
  attempts: number;
}

const Lifes = ({ attempts }: LifesProps) => {
  const attemptsArray = Array.from(Array(attempts).keys());
  const remainsArray = Array.from(Array(6 - attempts).keys());
  return (
    <>
      <div className="flex">
        {attemptsArray.map((i) => (
          <div key={i}>
            <Image
              src={"/life-lose.png"}
              alt="life lost"
              height={48}
              width={48}
            />
          </div>
        ))}
        {remainsArray.map((i) => (
          <div key={i}>
            <Image src={"/life.png"} alt="life" height={48} width={48} />
          </div>
        ))}
      </div>
    </>
  );
};

export default Lifes;

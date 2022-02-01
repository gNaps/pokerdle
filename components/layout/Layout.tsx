/* eslint-disable @next/next/no-title-in-document-head */
/* eslint-disable @next/next/no-document-import-in-page */
import Head from "next/head";

const Layout = (props: any) => {
  return (
    <>
      <Head>
        <link rel="icon" href="/pikachu.ico" />
        <meta
          name="description"
          content="Pokemon Game"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Pokerdle</title>
      </Head>
      <main className="w-96 min-h-screen">{props.children}</main>
    </>
  );
};

export default Layout;

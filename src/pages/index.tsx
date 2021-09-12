import Prismic from '@prismicio/client';
import Head from 'next/head';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { GetStaticProps } from 'next';
import Link from 'next/link';
import { useState } from 'react';
import { FiCalendar, FiUser } from 'react-icons/fi';
import Header from '../components/Header';
import { getPrismicClient } from '../services/prismic';
import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';
import postStyles from './post/post.module.scss';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

const PostCard = ({ post }) => {
  // format date '12 Set 2021':
  const first_publication_date = format(
    new Date(post.first_publication_date),
    'dd MMM yyyy',
    {
      locale: ptBR,
    }
  );

  return (
    <div className={styles.postcard_container}>
      <Link href={`/post/${post.uid}`}>
        <a>
          <h2>{post.data.title}</h2>
          <p>{post.data.subtitle}</p>
          <div className={postStyles.postcard_metadata}>
            <FiCalendar size={20} />
            <small>{first_publication_date}</small>
            <FiUser size={20} />
            <small>{post.data.author}</small>
          </div>
        </a>
      </Link>
    </div>
  );
};

async function Fetch(url: string): Promise<[PostPagination | null, boolean]> {
  const response = await (await fetch(url)).json();
  if (!response) return [null, true];
  return [response, false];
}

export default function Home({ postsPagination }: HomeProps): JSX.Element {
  const [nextPage, setNextPage] = useState<string | null>(
    postsPagination.next_page
  );
  const [results, setResults] = useState<Post[]>(postsPagination.results);
  const [errorLoadingResults, setErrorLoadingResults] =
    useState<boolean>(false);

  async function HandleFetchMorePosts(): Promise<null> {
    const [data, err] = await Fetch(nextPage);

    if (err) {
      setErrorLoadingResults(true);
      return;
    }
    setNextPage(data.next_page);
    setResults([...results, ...data.results]);
  }

  return (
    <>
      <Head>
        <title>Home | Space Traveling</title>
      </Head>

      <Header />

      <div className={commonStyles.container}>
        <main className={commonStyles.content}>
          <div className={postStyles.postlist}>
            {errorLoadingResults && (
              <p>Ocorreu um erro ao carregar os resultados</p>
            )}
            {results.map(post => (
              <PostCard key={post.uid} {...{ post }} />
            ))}
          </div>
          {nextPage && (
            <button
              type="button"
              className={commonStyles.button__load_more}
              onClick={HandleFetchMorePosts}
            >
              Carregar mais posts
            </button>
          )}
        </main>
      </div>
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    { fetch: ['post.title', 'post.content'], pageSize: 1 }
  );

  const results = postsResponse.results.map(post => {
    return {
      uid: post.uid,
      first_publication_date: post.first_publication_date,
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author,
      },
    };
  });

  return {
    props: { postsPagination: { results, next_page: postsResponse.next_page } },
  };
};

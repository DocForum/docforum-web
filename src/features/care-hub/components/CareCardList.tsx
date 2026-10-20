import { Link } from 'react-router-dom';
import type { CareCard } from '../ranking';
import styles from './CareCardList.module.css';

interface Props {
  cards: CareCard[];
}

export function CareCardList({ cards }: Props) {
  return (
    <ul className={styles.list}>
      {cards.map((card) => (
        <li key={card.id}>
          <Link to={card.to} className={styles.card}>
            <span className={styles.head}>
              <strong className={styles.title}>{card.title}</strong>
              {card.badge && <span className={styles.badge}>{card.badge}</span>}
            </span>
            <span className={styles.detail}>{card.detail}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

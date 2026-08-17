interface FaqItem {
  question: string;
  answer: string;
}

/**
 * Native `<details>`, so the FAQ works with no JavaScript and stays keyboard
 * operable for free. The first item is open, matching the prototype.
 */
export function FaqList({ items }: { items: readonly FaqItem[] }) {
  return (
    <div className="faq">
      {items.map((item, index) => (
        <details key={item.question} open={index === 0}>
          <summary>{item.question}</summary>
          <div className="ans">{item.answer}</div>
        </details>
      ))}
    </div>
  );
}

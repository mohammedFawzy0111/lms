import { ReactElement, ReactNode, Children, useState } from "react";
import "../styles/Tabs.css";

export interface TabProps {
  title: string;
  element: ReactNode;
  onActive?: () => void;
}

export interface TabsProps {
  children: ReactNode;
}

export function Tab({ element }: TabProps) {
  return <>{element}</>;
}

export function Tabs({ children }: TabsProps) {
  const [active, setActive] = useState(0);

  const tabs = Children.toArray(children) as ReactElement<TabProps>[];

  return (
    <>
      <div className="tabs-header">
        {tabs.map((tab, index) => (
          <button
            key={index}
            className={`tab ${active === index ? "active" : ""}`}
            onClick={() => {
              setActive(index);
              if (tab.props.onActive) tab.props.onActive();
            }}
          >
            {tab.props.title}
          </button>
        ))}
      </div>
      <div className="tabs-content">{tabs[active]?.props.element}</div>
    </>
  );
}

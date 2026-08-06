import { ReactElement, ReactNode, Children, useState } from "react";

export interface TabProps {
  title: string;
  element: ReactNode;
}

export interface TabsProps {
  children: ReactNode;
}

export function Tab ({ element }: TabProps) {
  return<>{element}</>
}

export function Tabs ({ children }: TabsProps) {
  const [active, setActive] = useState(0);

  const tabs = Children.toArray(children) as ReactElement<TabProps>[];

  return (
    <>
      <div className="tabs-header">
        {tabs.map((tab,index) => (
          <button
          key={index}
          className={`tab ${active === index? "active" : ""}`}
          onClick={()=> setActive(index)}
          >
          {tab.props.title}
          </button>
        ))}
      </div>
      <div className="tabs-content">
        {tabs[active]?.props.element}
      </div>
    </>
  );
}

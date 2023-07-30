import * as React from "react";
import { useApp } from "./hooks";

export const ReactView = () => {
  const { vault } = useApp();
  return <h4>{vault.getName()}</h4>;
};
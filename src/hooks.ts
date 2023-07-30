import { App } from "obsidian";
import { AppContext } from "./context";
import * as React from "react";

export const useApp = (): App | undefined => {
  return React.useContext(AppContext);
};
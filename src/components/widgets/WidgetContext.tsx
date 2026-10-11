import { createContext, useContext } from 'react';

/**
 * Lets a widget body publish a primary "add" action to its card header.
 * The bookmarks widget owns the editor dialog, but start.me puts the plus
 * beside the card title, so the body registers the handler and the frame
 * draws the button.
 */
export type AddHandler = (() => void) | null;

export const RegisterAddContext = createContext<(handler: AddHandler) => void>(() => {});

export const useRegisterAdd = () => useContext(RegisterAddContext);

/** Defines how an object type is created, inserted, and rendered. */
type ObjectTypeDefinition = {
	/** Stable object type id. */
	type: string;
	/** Quill blot used when this object type is inserted into the editor. */
	blotName?: string;
	/** Optional DOM event emitted by rendered embeds when their payload changes. */
	changeEventName?: string;
	/** Optional DOM event emitted by rendered embeds when they remove themselves. */
	removeEventName?: string;
	/** Optional Quill clipboard matchers owned by this object type. */
	clipboardMatchers?: Array<[string, (...args: any[]) => unknown]>;
	/** Allows a renderer to receive the current app context for out-of-tree React roots. */
	configureContext?: (contextValue: MusicNotebookContextValue) => void;
	/** Creates a default object or partial object for this type. */
	createDefaultObject?: (options?: unknown) => Partial<NotebookDocumentObject>;
	/** Converts a notebook document object into the value stored in the editor embed. */
	toEmbedValue?: (object: NotebookDocumentObject) => unknown;
	/** Converts an editor embed value back into a notebook document object patch. */
	fromEmbedValue?: (value: unknown) => Partial<NotebookDocumentObject>;
	/** React component used to render this object type. */
	renderComponent?: React.ComponentType<any>;
	/** React component used to edit this object type. */
	editorComponent?: React.ComponentType<any>;
};

/** Payload emitted when an object type is registered. */
type ObjectTypeRegisteredEvent = {
	/** Registered object type id. */
	typeId: string;
	/** Registered object type definition. */
	type: ObjectTypeDefinition;
	/** Current sorted object type definitions. */
	types: ObjectTypeDefinition[];
};

/** Payload emitted when an object type is removed. */
type ObjectTypeRemovedEvent = {
	/** Removed object type id. */
	typeId: string;
	/** Current sorted object type definitions. */
	types: ObjectTypeDefinition[];
};

/** Registry for feature-owned document object types. */
type ObjectTypeRegistryService = {
	/** Registers or updates an object type definition. */
	registerType: (typeId: string, definition: Partial<ObjectTypeDefinition>) => ObjectTypeDefinition | null;
	/** Gets one object type definition by id. */
	getType: (typeId: string) => ObjectTypeDefinition | null;
	/** Gets all registered object type definitions. */
	getTypes: () => ObjectTypeDefinition[];
	/** Removes an object type definition. */
	removeType: (typeId: string) => boolean;
	/** Subscribes to object-type-registry events. */
	listen?: (eventName: string, listener: (...args: any[]) => void) => unknown;
	/** Removes an object-type-registry event subscription. */
	unlisten?: (eventName: string, listener: unknown) => void;
};

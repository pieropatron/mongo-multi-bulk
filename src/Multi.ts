"use strict";

import util from 'util';
import {BulkWriteOptions, Collection, Document} from 'mongodb';
import {BulkWriteItem} from './Item';

const inspect = Symbol.for('nodejs.util.inspect.custom');

/**
 * create Multi BulkWriteItem object
 * @param items
 * @returns
 */
export function fromItemsObject<T extends Record<string, BulkWriteItem>> (items: T){
	const keys: (keyof T)[] = Object.keys(items);
	const result = {
		...items,
		/** get size of all items */
		get size(){
			let result = 0;
			keys.forEach((key)=>{
				result += items[key].size;
			});
			return result;
		},
		/** get keys */
		get keys(){ return keys.slice(); },
		/**
		 * execute all items
		 * @param options options for bulkWrite
		 * */
		async execute(options?: BulkWriteOptions){
			return Promise.all(keys.map(key=>{
				return items[key].execute(options);
			}));
		},
		toJSON(){
			return keys.map(key=>{
				return items[key].toJSON();
			});
		}
	};
	Object.defineProperty(result, inspect, {value: function(depth, options){
		const newOptions = Object.assign({}, options, {
			depth: options.depth === null ? null : options.depth - 1
		});

		return `BulkWriteMulti ${util.inspect(items, newOptions)}`;
	}});
	return result;
}

type _Collection<T extends Document = any> = Collection<T>;
type Get_Collection_T<C extends _Collection<any>> = C extends _Collection<infer T> ? T : unknown;
type _Record<TObj extends Record<string, _Collection>> = {
	[Property in keyof TObj]: BulkWriteItem<Get_Collection_T<TObj[Property]>>
};

export function fromCollectionsObject<T extends Record<string, _Collection>>(collections: T) {
	const items: any = {};
	for (const colname in collections){
		const collection = collections[colname];
		items[colname] = new BulkWriteItem<Get_Collection_T<typeof collection>>(collection, colname);
	}
	return fromItemsObject(items as _Record<T>);
}

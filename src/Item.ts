import {
	Collection, Document, BulkWriteOptions, AnyBulkWriteOperation, BulkWriteResult,
	OptionalId, Filter, WithoutId, CollationOptions, Hint,
	UpdateFilter
} from 'mongodb';
import util from 'util';

export interface Result {
	/** collection name */
	colname: string,
	/** operation count */
	count: number,
	/** result of bulkWrite */
	bulk?: BulkWriteResult
}

type DeleteOptions = {
	collation: CollationOptions, hint: Hint
}

type ReplaceOpts = DeleteOptions & {
	upsert: boolean
};

type UpdateOpts = ReplaceOpts & {
	arrayFilters: Document[]
};

export class BulkWriteItem<TSchema extends Document = any> {
	readonly collection: Collection<TSchema>;
	readonly colname: string;
	protected ops: AnyBulkWriteOperation<TSchema>[] = [];

	constructor(collection: Collection<TSchema>, colname?: string){
		if (!(collection instanceof Collection)){
			throw new Error(`Invalid collection`);
		}
		this.collection = collection;
		this.colname = colname || collection.collectionName;
	}

	[util.inspect.custom]() {
		return `BulkWriteItem {${this.colname}=>${this.ops.length}}`;
	}


	/** size of item */
	get size(){ return this.ops.length; }

	/**
	 * push new operation to item
	 * @param op[]
	 * */
	push(...op: AnyBulkWriteOperation<TSchema>[]){
		return this.ops.push(...op);
	}

	/**
	 * push insertOne operation
	 * @param document document to insert
	 * @returns
	 */
	insertOne(document: OptionalId<TSchema>){
		this.push({
			insertOne: {
				document
			}
		});
		return this;
	}

	/**
	 * tiny helper for insert of array of documents. In fact it just pushes many insertOne operations
	 * NB: at the moment insertMany is not supported as bulkWrite operations. Please, do not try to push ({insertMany}) manually
	 * @param documents documents to insert
	 * @returns
	 */
	insertMany(documents: OptionalId<TSchema>[]){
		documents.forEach(document=>{
			this.insertOne(document);
		});
		return this;
	}

	/**
	 * push replaceOne operation
	 * @param filter
	 * @param replacement
	 * @param options
	 * @returns
	 */
	replaceOne(filter: Filter<TSchema>, replacement: WithoutId<TSchema>, options?: Partial<ReplaceOpts>){
		options = options || {};
		this.push({
			replaceOne: {
				filter,
				replacement,
				...options
			}
		});
		return this;
	}

	/**
	 * push updateOne operation
	 * @param filter
	 * @param update
	 * @param options
	 * @returns
	 */
	updateOne(filter: Filter<TSchema>, update: UpdateFilter<TSchema> | UpdateFilter<TSchema>[], options?: Partial<UpdateOpts>){
		options = options || {};
		this.push({
			updateOne: {
				filter,
				update,
				...options
			}
		});
		return this;
	}

	/**
	 * push updateMany operation
	 * @param filter
	 * @param update
	 * @param options
	 * @returns
	 */
	updateMany(filter: Filter<TSchema>, update: UpdateFilter<TSchema> | UpdateFilter<TSchema>[], options?: Partial<UpdateOpts>){
		options = options || {};
		this.push({
			updateMany: {
				filter,
				update,
				...options
			}
		});
		return this;
	}

	/**
	 * push deleteOne operation
	 * @param filter
	 * @param options
	 * @returns
	 */
	deleteOne(filter: Filter<TSchema>, options?: Partial<UpdateOpts>){
		options = options || {};
		this.push({
			deleteOne: {
				filter,
				...options
			}
		});
		return this;
	}

	/**
	 * push deleteMany operations
	 * @param filter
	 * @param options
	 */
	deleteMany(filter: Filter<TSchema>, options?: Partial<UpdateOpts>){
		options = options || {};
		this.push({
			deleteMany: {
				filter,
				...options
			}
		});
	}

	/**
	 * Concat with another items.
	 * NB: mutate current item!
	 * @param items
	 */
	concat(...items: BulkWriteItem<TSchema>[]){
		if (!items.length){
			throw new Error(`Nothing to concat`);
		}

		for (const item of items){
			if (!(item instanceof BulkWriteItem)){
				throw new Error(`Invalid concat`);
			}
			this.ops.push(...item.ops);
		}

		return this;
	}

	/**
	 * bulkWrite all item operations
	 * @param options options for bulkWrite
	 * */
	async execute(options?: BulkWriteOptions){
		const ops = this.ops;
		this.ops = [];
		const result: Result = {
			colname: this.colname,
			count: ops.length
		};
		if (ops.length){
			result.bulk = await this.collection.bulkWrite(ops, options || {});
		}
		return result;
	}

	toJSON(){
		return {
			colname: this.colname,
			operations: this.ops.slice()
		};
	}

	toString(){
		return `BulkWriteItem (${this.colname} => ${this.size}})`;
	}
}

export function getItem<TSchema extends Document>(collection: Collection<TSchema>, colname?: string){
	return new BulkWriteItem(collection, colname);
}

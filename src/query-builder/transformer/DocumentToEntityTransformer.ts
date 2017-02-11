import {EntityMetadata} from "../../metadata/EntityMetadata";
import {Driver} from "../../driver/Driver";
import {MongoDriver} from "../../driver/mongodb/MongoDriver";
import {ObjectLiteral} from "../../common/ObjectLiteral";

/**
 * Transforms raw document into entity object.
 * Entity is constructed based on its entity metadata.
 */
export class DocumentToEntityTransformer {

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(// private aliasMap: AliasMap,
                // private joinMappings: JoinMapping[],
                // private relationCountMetas: RelationCountMeta[],
                private enableRelationIdValues: boolean = false
    ) {
    }

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    transformAll(documents: ObjectLiteral[], metadata: EntityMetadata) {
        return documents.map(document => this.transform(document, metadata));
    }

    transform(document: any, metadata: EntityMetadata) {
        const entity: any = metadata.create();
        let hasData = false;

        // handle _id property the special way
        if (metadata.hasObjectIdColumn && document["_id"]) {
            // todo: we can't use driver in this class
            // do we really need prepare hydrated value here? If no then no problem. If yes then think maybe prepareHydratedValue process should be extracted out of driver class?
            // entity[metadata.objectIdColumn.name] = this.driver.prepareHydratedValue(document["_id"], metadata.objectIdColumn);
            entity[metadata.objectIdColumn.name] = document["_id"];
            hasData = true;
        }

        // add special columns that contains relation ids
        if (this.enableRelationIdValues) {
            metadata.columns.filter(column => !!column.relationMetadata).forEach(column => {
                const valueInObject = document[column.name];
                if (valueInObject !== undefined && valueInObject !== null && column.propertyName) {
                    // todo: we can't use driver in this class
                    // const value = this.driver.prepareHydratedValue(valueInObject, column);
                    entity[column.propertyName] = valueInObject;
                    hasData = true;
                }
            });
        }

        /*this.joinMappings
            .filter(joinMapping => joinMapping.parentName === alias.name && !joinMapping.alias.parentAliasName && joinMapping.alias.target)
            .map(joinMapping => {
                const relatedEntities = this.transformIntoSingleResult(rawSqlResults, joinMapping.alias);
                const isResultArray = joinMapping.isMany;
                const result = !isResultArray ? relatedEntities[0] : relatedEntities;

                if (result && (!isResultArray || result.length > 0)) {
                    entity[joinMapping.propertyName] = result;
                    hasData = true;
                }
            });*/

        // get value from columns selections and put them into object
        metadata.columns.forEach(column => {
            const valueInObject = document[column.name];
            if (valueInObject !== undefined &&
                valueInObject !== null &&
                column.propertyName &&
                !column.isVirtual &&
                !column.isParentId &&
                !column.isDiscriminator) {
                // const value = this.driver.prepareHydratedValue(valueInObject, column);

                if (column.isInEmbedded) {
                    if (!entity[column.embeddedProperty])
                        entity[column.embeddedProperty] = column.embeddedMetadata.create();

                    entity[column.embeddedProperty][column.propertyName] = valueInObject;
                } else {
                    entity[column.propertyName] = valueInObject;
                }
                hasData = true;
            }
        });

        // if relation is loaded then go into it recursively and transform its values too
        /*metadata.relations.forEach(relation => {
            const relationAlias = this.aliasMap.findAliasByParent(alias.name, relation.propertyName);
            if (relationAlias) {
                const joinMapping = this.joinMappings.find(joinMapping => joinMapping.type === "join" && joinMapping.alias === relationAlias);
                const relatedEntities = this.transformIntoSingleResult(rawSqlResults, relationAlias);
                const isResultArray = relation.isManyToMany || relation.isOneToMany;
                const result = !isResultArray ? relatedEntities[0] : relatedEntities;

                if (result) {
                    let propertyName = relation.propertyName;
                    if (joinMapping) {
                        propertyName = joinMapping.propertyName;
                    }

                    if (relation.isLazy) {
                        entity["__" + propertyName + "__"] = result;
                    } else {
                        entity[propertyName] = result;
                    }

                    if (!isResultArray || result.length > 0)
                        hasData = true;
                }
            }

            // if relation has id field then relation id/ids to that field.
            if (relation.isManyToMany) {
                if (relationAlias) {
                    const ids: any[] = [];
                    const joinMapping = this.joinMappings.find(joinMapping => joinMapping.type === "relationId" && joinMapping.alias === relationAlias);

                    if (relation.idField || joinMapping) {
                        const propertyName = joinMapping ? joinMapping.propertyName : relation.idField as string;
                        const junctionMetadata = relation.junctionEntityMetadata;
                        const columnName = relation.isOwning ? junctionMetadata.columns[1].name : junctionMetadata.columns[0].name;

                        rawSqlResults.forEach(results => {
                            if (relationAlias) {
                                const resultsKey = relationAlias.name + "_" + columnName;
                                const value = this.driver.prepareHydratedValue(results[resultsKey], relation.referencedColumn);
                                if (value !== undefined && value !== null)
                                    ids.push(value);
                            }
                        });

                        if (ids && ids.length)
                            entity[propertyName] = ids;
                    }
                }
            } else if (relation.idField) {
                const relationName = relation.name;
                entity[relation.idField] = this.driver.prepareHydratedValue(rawSqlResults[0][alias.name + "_" + relationName], relation.referencedColumn);
            }

            // if relation counter
            this.relationCountMetas.forEach(joinMeta => {
                if (joinMeta.alias === relationAlias) {
                    // console.log("relation count was found for relation: ", relation);
                    // joinMeta.entity = entity;
                    joinMeta.entities.push({ entity: entity, metadata: metadata });
                    // console.log(joinMeta);
                    // console.log("---------------------");
                }
            });
        });*/

        return hasData ? entity : null;
    }

}
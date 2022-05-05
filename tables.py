import numpy as np
import pandas as pd


# read the data from the csv files into a dataframe
themes = pd.read_csv('input/themes.csv')
sets = pd.read_csv('input/sets.csv')
parts = pd.read_csv('input/parts.csv')
part_categories = pd.read_csv('input/part_categories.csv')
part_relationships = pd.read_csv('input/part_relationships.csv')
minifigs = pd.read_csv('input/minifigs.csv')
inventories = pd.read_csv('input/inventories.csv')
inventory_sets = pd.read_csv('input/inventory_sets.csv')
inventory_parts = pd.read_csv('input/inventory_parts.csv')
inventory_minifigs = pd.read_csv('input/inventory_minifigs.csv')
colors = pd.read_csv('input/colors.csv')
elements = pd.read_csv('input/elements.csv')

themes = themes.rename({'id': 'theme_id'}, axis=1)

# parent themes where parent_id is null
root_parent_themes = themes[themes.parent_id.isnull()]
root_parent_themes = root_parent_themes[['theme_id', 'name']]
root_parent_themes.reset_index(inplace=True, drop=True)
#root_parent_themes.to_csv("root_parent_themes.csv")
#%%
circle_pack = pd.merge(themes, sets, how="left", on="theme_id")
#%%
circle_pack.dropna(subset = ['year'], inplace=True)
#%%
circle_pack.rename(columns={"name_x": "theme_name", "name_y": "set_name"}, inplace=True)
circle_pack.drop(columns=["set_num"], inplace=True)
circle_pack.sort_values(by=["year"], inplace=True)
#%%
circle_pack.year = circle_pack.year.astype(int)
circle_pack.num_parts = circle_pack.num_parts.astype(int)
circle_pack.reset_index(drop=True, inplace=True)
circle_pack.to_csv("circle_pack.csv")




#%%
# The leafs are the elements from the child column that do not exist in parent one
hierarchy = themes[~themes['theme_id'].isin(themes['parent_id'])]
del hierarchy["name"]
del themes["name"]
hierarchy.columns = ['leaf', 'lev_1']

# finding all levels
ix = 1
while True:
    hierarchy = hierarchy.merge(themes, 'left', left_on=f'lev_{ix}', right_on='theme_id'
                                ).drop(columns='theme_id')
    if (hierarchy['parent_id'].isna().all()):
        hierarchy = hierarchy.drop(columns='parent_id')
        break
    hierarchy.loc[hierarchy['parent_id'].isna(), f'lev_{ix}':'parent_id'] = hierarchy[hierarchy['parent_id'].isna()][['parent_id', f'lev_{ix}']
                                                   ].values
    print(hierarchy)
    ix += 1
    hierarchy = hierarchy.rename(columns={'parent_id': f'lev_{ix}'})
# rename and reorder columns to match your expected result
hierarchy = hierarchy.rename(columns={f'lev_{ix - i}': f'lev_{i}' for i in range(ix)}
                             ).reindex(columns=[f'lev_{i}' for i in range(ix)]
                                 + ['leaf'])

# move the nan values to there place (from leaf to lev_1 or lev_0)
hierarchy.lev_1.fillna(hierarchy.leaf, inplace=True)
hierarchy["lev_1_null"] = hierarchy['lev_1'].eq(hierarchy['leaf'])
hierarchy.loc[hierarchy.lev_1_null, "leaf"] = np.nan
del hierarchy["lev_1_null"]
hierarchy.lev_0.fillna(hierarchy.lev_1, inplace=True)
hierarchy["lev_0_null"] = hierarchy['lev_0'].eq(hierarchy['lev_1'])
hierarchy.loc[hierarchy.lev_0_null, "lev_1"] = np.nan
del hierarchy["lev_0_null"]


# reload themes.csv
themes = pd.read_csv('input/themes.csv')
themes = themes.rename({'id': 'theme_id'}, axis=1)
del themes["parent_id"]

# theme_hierarchy: table with themes broken down to their hierarchical levels + their names
# add lev_0_names
theme_hierarchy = pd.merge(hierarchy, themes, how="left", left_on="lev_0", right_on="theme_id").drop(columns='theme_id')
theme_hierarchy.rename(columns={"name":"lev_0_name"}, inplace=True)
theme_hierarchy = theme_hierarchy[["lev_0", "lev_0_name", "lev_1", "leaf"]]

# add lev_1 names
theme_hierarchy = pd.merge(theme_hierarchy, themes, how="left", left_on="lev_1", right_on="theme_id").drop(columns='theme_id')
theme_hierarchy.rename(columns={"name":"lev_1_name"}, inplace=True)
theme_hierarchy = theme_hierarchy[["lev_0", "lev_0_name", "lev_1", "lev_1_name", "leaf"]]


# add leaf names
theme_hierarchy = pd.merge(theme_hierarchy, themes, how="left", left_on="leaf", right_on="theme_id").drop(columns='theme_id')
theme_hierarchy.rename(columns={"name":"leaf_name"}, inplace=True)
theme_hierarchy = theme_hierarchy[["lev_0", "lev_0_name", "lev_1", "lev_1_name", "leaf", "leaf_name"]]


# %%
# reload themes.csv
themes = pd.read_csv('input/themes.csv')
themes = themes.rename({'id': 'theme_id'}, axis=1)
def get_all_children(id):
    list_of_children = []

    def dfs(id):
        # when
        child_ids = themes[themes["parent_id"] == id]["theme_id"]
        if child_ids.empty:
            return
        for child_id in child_ids:
            list_of_children.append(child_id)
            dfs(child_id)

    dfs(id)
    return list_of_children

# contains all children of the themes (nem csak közvetlen leszármazott)
# themes + list of every children themes (not only root)
theme_children = themes.copy()
theme_children["all_children_theme"] = themes["parent_id"].apply(get_all_children)

theme_children.drop(columns=["theme_id", "name"], inplace=True)

theme_children.drop_duplicates(subset=["parent_id"], inplace=True)
theme_children = theme_children.dropna()
theme_children.rename(columns={'parent_id': 'theme_id'}, inplace=True)
theme_children.reset_index(drop=True, inplace=True)



# unstack lists of children themes
# ["theme_id", "children_theme_id"]
theme_children_unstacked = pd.DataFrame({'theme_id':np.repeat(theme_children.theme_id.values, theme_children.all_children_theme.str.len()),
                        'children_theme_id':np.concatenate(theme_children.all_children_theme.values)})
# theme_id + children_theme_id + theme_name + parent_id
# it will be useful to discover levels of children
theme_children_unstacked_with_parents = pd.merge(theme_children_unstacked, themes, how="left", on="theme_id", suffixes=("_x", "_y"))



# add theme names
# only root parent themes (134) and all their children (total: 490)
# ["root_theme_id", "root_theme_name", "children_theme_id"]
root_theme_children_unstacked = pd.merge(theme_children_unstacked, root_parent_themes, how="right", on="theme_id")

root_theme_children_unstacked.rename(columns={'theme_id': 'root_theme_id', "name":"root_theme_name"}, inplace=True)
root_theme_children_unstacked = root_theme_children_unstacked.loc[:, ["root_theme_id", "root_theme_name", "children_theme_id"]]




# add children theme names
# ["root_theme_id", "root_theme_name", "children_theme_id", "children_theme_name"]
root_theme_children_unstacked = pd.merge(root_theme_children_unstacked, themes, how="left", left_on="children_theme_id", right_on="theme_id")

root_theme_children_unstacked.rename(columns={"name": "children_theme_name"}, inplace=True)
root_theme_children_unstacked.drop(columns=["theme_id", "parent_id"], inplace=True)

# add sets to children themes
# sets with root theme and their children theme
#  WARNING: themes with no children themes have NAN sets here
# ["root_theme_id", "root_theme_name", "children_theme_id", "children_theme_name", "set_num", "set_name", "year", "num_parts"]
sets_and_themes = pd.merge(root_theme_children_unstacked, sets, how="left", left_on="children_theme_id", right_on="theme_id")
sets_and_themes.drop(columns="theme_id", inplace=True)
sets_and_themes.rename(columns={"name":"set_name"}, inplace=True)

# sets with [themes with at least 1 children] converting id's to integer values
children_themes_with_sets = sets_and_themes.dropna()
children_themes_with_sets = children_themes_with_sets.astype({"root_theme_id": int, "children_theme_id": int, "year": int, "num_parts": int})



# add sets to root themes
# sets with root theme and their children theme
# ["root_theme_id", "root_theme_name", "children_theme_id", "children_theme_name", "set_num", "set_name", "year", "num_parts"]
root_themes_with_sets = pd.merge(root_theme_children_unstacked, sets, how="left", left_on="root_theme_id", right_on="theme_id")
del root_themes_with_sets["children_theme_id"]
del root_themes_with_sets["children_theme_name"]
root_themes_with_sets.drop_duplicates(inplace=True)
del root_themes_with_sets["theme_id"]
root_themes_with_sets.rename(columns={"name": "set_name"})
root_themes_with_sets["children_theme_id"] = np.nan
root_themes_with_sets["children_theme_name"] = np.nan


# THEMES WITH SETS
themes_with_sets = root_themes_with_sets.append(children_themes_with_sets, ignore_index=True, sort=True)

themes_with_sets.dropna(subset=["year"], inplace=True)
themes_with_sets["year"] = themes_with_sets["year"].astype(int)
del themes_with_sets["set_name"]
#%%
themes_with_sets.rename(columns={"name":"set_name"}, inplace=True)

cols = themes_with_sets.columns.tolist()
cols = cols[4:6] + cols[:4] + cols[-2:]
print(cols)
themes_with_sets = themes_with_sets[cols]
#%%




#%%
# count number of sets under [root parent theme]
root_num_sets = themes_with_sets["root_theme_id"].value_counts()
root_num_sets = root_num_sets.reset_index()
root_num_sets.rename(columns={"index": "root_theme_id", "root_theme_id": "total_num_sets"}, inplace=True)


# add num_sets column to [sets and themes]
sets_and_themes = pd.merge(sets_and_themes, root_num_sets, how="left", on="root_theme_id")
sets_and_themes = sets_and_themes.loc[:, ["root_theme_id", "root_theme_name", "num_sets", "children_theme_id","children_theme_name", "set_num", "set_name", "year", "num_parts"]]
sets_and_themes = sets_and_themes.sort_values(by=["num_sets"], ascending=False)
#sets_and_themes.to_csv("sets_and_themes.csv")



# count number of sets under [children parent theme]
child_num_sets = themes_with_sets["children_theme_id"].value_counts()
child_num_sets = child_num_sets.reset_index()
child_num_sets.rename(columns={"index": "children_theme_id", "children_theme_id": "total_num_sets"}, inplace=True)


# merge total_num_sets to themes.csv
themes_with_numsets = pd.merge(themes, root_num_sets, how="left", left_on="theme_id", right_on="root_theme_id")

del themes_with_numsets["root_theme_id"]
themes_with_numsets = pd.merge(themes_with_numsets, child_num_sets, how="left", left_on="theme_id", right_on="children_theme_id")

del themes_with_numsets["children_theme_id"]

themes_with_numsets["total_num_sets"] = themes_with_numsets["total_num_sets_x"].fillna(themes_with_numsets["total_num_sets_y"])

del themes_with_numsets["total_num_sets_x"]
del themes_with_numsets["total_num_sets_y"]
themes_with_numsets.to_csv("hierarchy_with_totalnumsets.csv")


#sets_and_themes.to_csv("sets_and_themes.csv")
#sets_and_themes['idx'] = sets_and_themes.groupby('root_theme_name').cumcount()
#sets_and_themes.set_index('idx', inplace=True)
#sets_and_themes.drop(columns=["num_parts", "set_num", "num_sets", "children_theme_id", "children_theme_name", "root_theme_id"], inplace=True)
#%%
#%%
#sets = pd.read_csv("input/sets.csv")
#sets_and_themes_wide = sets_and_themes.pivot(columns='root_theme_name',values='set_name', index="year")

#%%
#sets_and_themes_wide = pd.merge(sets_and_themes_wide, sets, how="left", left_index=True, right_on="set_num")



#%%

#%%

# in the following I'll make sure that I produced the same data with the hierarchy way and
# with the get_all_children() function
# but yeah they did

# check len of different hierarchy levels
print(len(pd.unique(hierarchy["lev_0"]))) # 134
print(len(pd.unique(hierarchy["lev_1"]))) # 326
hierarchy["lev_1"].isna().sum()
print(len(pd.unique(hierarchy["leaf"])))  # 77


#%%
# check len for the differently generated data
print(len(pd.unique(sets_and_themes["root_theme_name"])))
print(len(pd.unique(sets_and_themes["children_theme_name"])))

#%%
lev_1 = theme_hierarchy[["lev_0", "lev_1", "lev_1_name"]].copy()
lev_1.dropna(inplace=True)
lev_1.rename(columns={"lev_1":"child_id", "lev_1_name":"child_name"}, inplace=True)
leaf = theme_hierarchy[["leaf", "leaf_name"]].copy()
leaf.rename(columns={"leaf":"child_id", "leaf_name":"child_name"}, inplace=True)
leaf.dropna(inplace=True)
#%%
theme_hierarchy_all_children = lev_1.append(leaf, ignore_index=True)
theme_hierarchy_all_children = pd.merge(root_parent_themes, theme_hierarchy_all_children, how="left", left_on="theme_id", right_on="lev_0")
del theme_hierarchy_all_children["lev_0"]



#%%
# here I'm counting the number of sets per year
#%%
count_sets_per_year = themes_with_sets.groupby(['root_theme_name', 'year']).size()
root_themes_sets_per_year = count_sets_per_year.to_frame(name ='num_set_per_year').reset_index()
root_themes_sets_per_year.sort_values(by=["year"], ascending=False, inplace=True)
root_themes_sets_per_year.reset_index(inplace=True)
del root_themes_sets_per_year["index"]
root_themes_sets_per_year.to_csv("root_themes_sets_per_year.csv")

# and add the information to the sets_and_themes table
sets_and_themes = pd.merge(themes_with_sets, root_themes_sets_per_year, how='left', on=["root_theme_name", "year"])
#%%
# reorder columns
cols = list(sets_and_themes.columns.values)
cols = cols[:3] + cols[-1:] + cols[3:-1]
sets_and_themes = sets_and_themes[cols]
sets_and_themes.sort_values(by=["year"], inplace=True)
sets_and_themes.reset_index(inplace=True)
del sets_and_themes["index"]
#sets_and_themes.to_csv("themes_with_sets_ordered.csv")
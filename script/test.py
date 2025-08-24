# -*- coding: utf-8 -*-
import pandas as pd
import math
import json
import os

# origin source from: [@Bilibili-凸包里的毛线](https://space.bilibili.com/18441978")
xls_file = r"~\Downloads\守望先锋地图英雄推荐表.xlsx"
df = pd.read_excel(xls_file, sheet_name="Sheet2")

rt = [tuple(row) for row in df.itertuples(index=False, name=None)]

template = {
    "dva": 0,
    "doomfist": 0,
    "hazard": 0,
    "junker-queen": 0,
    "mauga": 0,
    "orisa": 0,
    "ramattra": 0,
    "reinhardt": 0,
    "roadhog": 0,
    "sigma": 0,
    "winston": 0,
    "wrecking-ball": 0,
    "zarya": 0,
    "ashe": 0,
    "bastion": 0,
    "cassidy": 0,
    "echo": 0,
    "freja": 0,
    "genji": 0,
    "hanzo": 0,
    "junkrat": 0,
    "mei": 0,
    "pharah": 0,
    "reaper": 0,
    "sojourn": 0,
    "soldier76": 0,
    "sombra": 0,
    "symmetra": 0,
    "torbjorn": 0,
    "tracer": 0,
    "venture": 0,
    "widowmaker": 0,
    "ana": 0,
    "baptiste": 0,
    "brigitte": 0,
    "illari": 0,
    "juno": 0,
    "kiriko": 0,
    "lifeweaver": 0,
    "lucio": 0,
    "mercy": 0,
    "moira": 0,
    "zenyatta": 0
}

# print(rt)
heroes = {}
with open(r"..\data\heroes.json", "r") as fp:
    heroes = json.load(fp=fp)

def find_hero_id(name):
    for it in heroes["heroes"]:
        if name == it["name"]:
            return it["id"]
    print("No hero: ", name)
    exit(1)

def find_hero_name(heroid):
    for it in heroes["heroes"]:
        if heroid == it["id"]:
            return it["name"]
    print("No hero: ", heroid)
    exit(1)

def has_common_prefix_os(str1, str2):
    common = os.path.commonprefix([str1, str2])
    return common

heroDict = {}
for hero in template.keys():
    heroDict[find_hero_name(hero)] = hero

print(heroDict.keys())

last_map = ""
cur_map = ""
map_hero_power = template.copy()
for row in rt:
    if row[0] == "地图名称":
        continue
    cur_map = row[0] if str(row[0]) != "nan" else cur_map
    if last_map == "":
        last_map = cur_map
    else:
        if last_map != cur_map:
            if has_common_prefix_os(last_map, cur_map):
                # same map
                last_map = cur_map = has_common_prefix_os(last_map, cur_map)
            else:
                print(last_map, ": \n", json.dumps(map_hero_power, indent=4))
                last_map = cur_map
                map_hero_power = template.copy()
        # print(last_map, cur_map)
        for hero in heroDict.keys():
            if hero in row[1]:
                hero_id = heroDict[hero]
                map_hero_power[hero_id] += 10
            if str(row[2]) != "nan" and hero in row[2]:
                hero_id = heroDict[hero]
                map_hero_power[hero_id] += 1
            if str(row[3]) != "nan" and hero in row[3]:
                hero_id = heroDict[hero]
                map_hero_power[hero_id] -= 10
print(last_map, ": \n", json.dumps(map_hero_power, indent=4))

# print(json.dumps(heroes, indent=4, ensure_ascii=False))
cmake_minimum_required(VERSION 3.22.1)
project(bcore_dummy)

add_library(bcore_dummy SHARED dummy.cpp)

# Android log library (optional)
find_library(log-lib log)
target_link_libraries(bcore_dummy ${log-lib})

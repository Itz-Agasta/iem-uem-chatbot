#!/bin/bash

# We will just rewrite the left-side related css classes in EventBanner.css
sed -i 's/\.event-slide-item {/.event-slide-item {\n  position: relative;\n  height: 100%;\n  flex-shrink: 0;\n  display: flex;\n  align-items: flex-end;\n}/g' frontend/src/components/EventBanner.css


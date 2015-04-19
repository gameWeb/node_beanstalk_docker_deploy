# Pull base image.
FROM nodesource/trusty:0.10.36

# Create working directory.
ADD . /src

# Define working directory.
RUN cd /src; npm install

WORKDIR /src

EXPOSE 3007
# Define default command.
CMD ["npm", "start"]

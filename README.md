# plex-copy

CLI for copying transcoded files from Plex Optimised Versions

## Requirements

- NodeJS / Docker
- TV Show Folders must be named `TV Show (1980)` style. The brackets and their contents are ignored.

## Running directly

```console
$ npx plex-copy --help
Usage: plex-copy [OPTION]... PATHS...
Copy all Plex Optimised Versions to the correct directories, replacing originals.
Supply one or more source PATHS to check. If these are glob patterns then they
will be expanded (and dot prefixed folders ignored).

Options:
  --copy-subtitles  also copy subtitles (forced will always be copied)     [boolean] [default: true]
  --delete-empty    delete empty folders                                   [boolean] [default: true]
  --dry-run         do everything except actually change the filesystem   [boolean] [default: false]
  --interval        run every X minutes                                        [number] [default: 0]
  --verbose         show details on all operations                         [boolean] [default: true]
  --watch           watch for changes and automatically run               [boolean] [default: false]
  --help            Show help                                                              [boolean]
  --version         Show version number                                                    [boolean]
```

This will delete the original file, but not the optimised version. The next time Plex scans the source files it will do that automatically. It only deletes the file after the new one has been successfully copied over.

If the new file has already been copied then this will ignore it (and report "`Skipped "xyz/s01e23.mp4"`")

Simply supply it with a path to a Plex library folder.

## Docker / Docker-compose

There is a [docker image available](https://hub.docker.com/repository/docker/rycochet/plex-copy), which can be used to automatically run while next to your Plex docker image. You can change the `command:` value to any set of arguments, the default is shown below. You can pass any folder for the paths to check, but `/data/` is suggested for consistency.

You should set the `UID` and `GID` to be used to ensure that this runs as the same user as Plex, otherwise it may have permissions issues when trying to delete files.

```yaml
services:
  plex-copy:
    container_name: plex-copy
    image: rycochet/plex-copy:latest
    restart: unless-stopped
    # user: "1000:1000" # Set this to the same UID and GID as Plex
    volumes:
      - "/Multimedia/Anime:/data/Anime"
      - "/Multimedia/TV Shows:/data/TV Shows"
    # command: "/data/* --delete-empty --watch --interval 60" # Default arguments passed to docker image
```

## License

* The MIT License.
* See [LICENSE.md](./LICENSE.md) for details.

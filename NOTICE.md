# Third-party notices

This repository combines Yocare-authored material with third-party software, data, and assets. The proprietary notice in the root `LICENSE` applies only to Yocare-owned original material and does not replace third-party licences.

## IPTV source catalogue

The `iptv-source/` directory is imported from the upstream `iptv-org/iptv` project and contains its own `LICENSE` file (Unlicense). Its files remain subject to that upstream licence and any applicable rights in submitted metadata or stream references. Do not assume Yocare owns that catalogue or has redistribution rights to any linked channel or stream.

## Software dependencies

Runtime and development dependencies are declared in `package.json` and locked in `bun.lock`. Each dependency remains subject to its own licence. Review the package's published licence and notices before redistributing a bundled build.

## Other external material

Brand marks, channel logos, programme artwork, video, channel metadata, API responses, and other external content may be owned by third parties. Their appearance in the application does not imply that Yocare owns them or has rights to redistribute them. Obtain and document the required permissions before production use.

## Maintainer checklist

- Keep upstream licence and attribution files intact.
- Record the source, version, licence, and modifications for imported code.
- Do not copy third-party assets or stream URLs into the product without checking their terms and rights.
- Re-run a dependency and licence review when dependencies or imported directories change.
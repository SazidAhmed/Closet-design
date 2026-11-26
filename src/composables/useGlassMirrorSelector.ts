import { GLASS_MIRROR_DATA } from '../features/closet/domain/materials/materialConstants'
import { getImageUrl } from '../lib/utils'

/**
 * Composable for handling Glass and Mirror selection logic
 * @param roomComponents - The room components data from API
 */
export function useGlassMirrorSelector(roomComponents: any = null) {
  const useDynamicData = roomComponents && roomComponents.glass_mirror_types && roomComponents.glass_mirror_options

  const getParentOptions = (allowBoth = false) => {
    if (useDynamicData) {
      const types = roomComponents.glass_mirror_types || []

      if (allowBoth) {
        return types.map((type: any) => ({
          id: type.id,
          key: type.key,
          title: type.title,
          image: type.image || getImageUrl(),
        }))
      } else {
        const glassType = types.find((t: any) => t.key === 'glass')
        return glassType ? [{
          id: glassType.id,
          key: glassType.key,
          title: glassType.title,
          image: glassType.image || getImageUrl(),
        }] : []
      }
    } else {
      const parents = []
      parents.push({
        ...GLASS_MIRROR_DATA.PARENTS.GLASS,
        image: getImageUrl(),
      })

      if (allowBoth) {
        parents.push({
          ...GLASS_MIRROR_DATA.PARENTS.MIRROR,
          image: getImageUrl(),
        })
      }

      return parents
    }
  }

  const getChildOptions = (parentKey: string) => {
    if (useDynamicData) {
      const types = roomComponents.glass_mirror_types || []
      const options = roomComponents.glass_mirror_options || []

      const parentType = types.find((t: any) => t.key === parentKey)
      if (!parentType) return []

      return options
        .filter((opt: any) => opt.glass_mirror_type_id === parentType.id)
        .map((opt: any) => ({
          id: opt.id,
          key: opt.key,
          title: opt.title,
          parentKey: parentKey,
          image: opt.image || getImageUrl(),
        }))
    } else {
      return (GLASS_MIRROR_DATA.CHILDREN as any)[parentKey] || []
    }
  }

  const getChildrenMap = () => {
    if (useDynamicData) {
      const types = roomComponents.glass_mirror_types || []
      const options = roomComponents.glass_mirror_options || []

      const childrenMap: Record<string, any[]> = {}

      types.forEach((type: any) => {
        childrenMap[type.key] = options
          .filter((opt: any) => opt.glass_mirror_type_id === type.id)
          .map((opt: any) => ({
            id: opt.id,
            key: opt.key,
            title: opt.title,
            parentKey: type.key,
            image: opt.image || getImageUrl(),
          }))
      })

      return childrenMap
    } else {
      return GLASS_MIRROR_DATA.CHILDREN
    }
  }

  const findParentByKey = (key: string, allowBoth = false) => {
    const parents = getParentOptions(allowBoth)
    return parents.find((p: any) => p.key === key)
  }

  const validateChildSelection = (child: any, allowBoth = false) => {
    const parentKey = child.parentKey
    const parentOption = findParentByKey(parentKey, allowBoth)

    if (!parentOption) {
      return { valid: false, error: 'Invalid parent selection' }
    }

    return {
      valid: true,
      parent: parentOption,
      child: child,
    }
  }

  return {
    getParentOptions,
    getChildOptions,
    getChildrenMap,
    findParentByKey,
    validateChildSelection,
  }
}
